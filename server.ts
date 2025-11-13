import express, { Request, Response } from 'express';
import cors from 'cors';
import * as http from 'http';
import {
  parseTimetable,
  parseTimetablesByGroup,
  parseMultipleTimetables,
  exportToJson,
  createTimetableHash,
} from './src/timetable-parser';
import { Timetable, TimetableEntry } from './src/types';
import {
  initializeCache,
  getAllFields,
  getField,
  getAllSubjects,
  getSubject,
  searchSubjects,
  getCacheStats
} from './src/cache-manager';
import {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  createScheduleChangeNotification,
  cleanupExpiredNotifications
} from './src/notification-manager';
import { NotificationType, NotificationPriority } from './src/notification-types';
import { PushNotificationManager } from './src/push-notification-manager';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize push notification manager
let pushManager: PushNotificationManager;

// Helper function to transform timetable entry to frontend format
function transformTimetableEntry(entry: TimetableEntry, id: number) {
  // Parse hours (e.g., "8-10" or "8:00-10:00")
  const parseTime = (hourStr: string) => {
    const match = hourStr.match(/(\d+):?(\d*)/);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: match[2] ? parseInt(match[2]) : 0
      };
    }
    return { hour: 8, minute: 0 };
  };

  const hours = entry.hours.split('-');
  const startTime = parseTime(hours[0] || '8');
  const endTime = parseTime(hours[1] || '10');

  // Normalize day name to lowercase English
  const dayMap: Record<string, string> = {
    'luni': 'monday',
    'marti': 'tuesday',
    'marți': 'tuesday',
    'miercuri': 'wednesday',
    'joi': 'thursday',
    'vineri': 'friday',
    'sambata': 'saturday',
    'sâmbătă': 'saturday',
    'duminica': 'sunday',
    'duminică': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday'
  };

  // Normalize frequency - check for specific patterns first
  let frequency = 'weekly'; // default
  const freqLower = (entry.frequency || '').toLowerCase().trim();

  if (freqLower.includes('sapt. 1') || freqLower.includes('săpt. 1') || freqLower === 's1') {
    frequency = 'oddweeks'; // săptămână impară
  } else if (freqLower.includes('sapt. 2') || freqLower.includes('săpt. 2') || freqLower === 's2') {
    frequency = 'evenweeks'; // săptămână pară
  } else if (freqLower.includes('1-14') || freqLower.includes('săpt') || freqLower.includes('sapt')) {
    frequency = 'weekly'; // toate săptămânile
  }

  // Normalize type
  const typeMap: Record<string, string> = {
    'curs': 'lecture',
    'c': 'lecture',
    'lecture': 'lecture',
    'seminar': 'seminar',
    's': 'seminar',
    'laborator': 'lab',
    'lab': 'lab',
    'l': 'lab'
  };

  const day = dayMap[entry.day?.toLowerCase()] || 'monday';
  const type = typeMap[entry.type?.toLowerCase()] || 'lecture';

  return {
    id,
    day,
    interval: {
      start: startTime,
      end: endTime
    },
    subjectName: entry.subject || 'Unknown',
    teacher: entry.teacher || 'Unknown',
    frequency,
    type,
    room: entry.room || '',
    format: entry.group || ''  // MIE3, 832, 831/1, etc. - valoarea din coloana Formatia
  };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API documentation
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'UBB Timetable Parser API',
    version: '2.0.0',
    description: 'REST API for UBB Cluj timetable management - Frontend Compatible',
    mainEndpoints: {
      'GET /teachers': 'Get list of all teachers',
      'GET /fields': 'Get all fields/specializations with years',
      'GET /teacher/{teacherName}/timetable': 'Get teacher\'s timetable',
      'GET /field/{fieldId}/year/{year}/timetables': 'Get all group timetables for a field and year',
      'GET /subjects': 'Get all subjects with their entries',
    },
    additionalEndpoints: {
      'GET /': 'API documentation (this page)',
      'GET /health': 'Health check endpoint',
      'GET /cache/stats': 'Get cache statistics',
      'GET /fields/:name': 'Get specific field by name',
      'GET /subjects/:name': 'Get specific subject by name',
      'GET /subjects/search': 'Search subjects by name (requires ?q=searchTerm)',
      'POST /cache/refresh': 'Manually refresh cache',
      'GET /parse': 'Parse a single timetable (requires ?url=<timetable_url>)',
      'POST /parse-multiple': 'Parse multiple timetables (requires JSON body with urls array)',
      'GET /example-urls': 'Get example timetable URLs',
      'GET /notifications': 'Get notifications',
      'POST /notifications': 'Create a new notification',
      'GET /notifications/:id': 'Get specific notification by ID',
      'PUT /notifications/:id/read': 'Mark notification as read',
      'PUT /notifications/read-all': 'Mark all notifications as read',
      'DELETE /notifications/:id': 'Delete a notification',
      'GET /notifications/stats': 'Get notification statistics',
      'POST /notifications/schedule-change': 'Create schedule change notification',
      'GET /push/vapid-public-key': 'Get VAPID public key for web push',
      'POST /push/subscribe': 'Subscribe to push notifications',
      'POST /push/unsubscribe': 'Unsubscribe from push notifications',
      'GET /push/stats': 'Get push notification statistics',
      'POST /push/send': 'Send push notification to specific users',
      'POST /push/broadcast': 'Broadcast notification to all users',
    },
    exampleUsage: {
      teachers: 'GET /teachers',
      fields: 'GET /fields',
      teacherTimetable: 'GET /teacher/Prof.%20John%20Smith/timetable',
      fieldYearTimetables: 'GET /field/1/year/2/timetables',
      subjects: 'GET /subjects',
      searchSubjects: 'GET /subjects/search?q=programare',
    },
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Get cache statistics
app.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCacheStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Refresh cache manually
app.post('/cache/refresh', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual cache refresh triggered...');
    await initializeCache();
    const stats = getCacheStats();

    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      data: stats,
    });
  } catch (error: any) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get all fields - matches frontend API spec
app.get('/fields', async (req: Request, res: Response) => {
  try {
    const fields = await getAllFields();

    // Return array of fields with id, name, and years
    const fieldsData = fields.map((field, index) => ({
      id: index + 1,
      name: field.name,
      years: field.years,
    }));

    res.json(fieldsData);
  } catch (error: any) {
    console.error('Error loading fields:', error);
    res.status(500).json({
      error: 'Failed to load fields',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get specific field by name
app.get('/fields/:name', async (req: Request, res: Response) => {
  try {
    const fieldName = decodeURIComponent(req.params.name);
    const field = await getField(fieldName);

    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Field not found',
        message: `No field found with name: ${fieldName}`,
      });
    }

    res.json({
      success: true,
      data: {
        name: field.name,
        years: field.years,
        yearLinks: Object.fromEntries(field.yearLinks),
      },
    });
  } catch (error: any) {
    console.error('Error loading field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load field',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get all subjects - matches frontend API spec
app.get('/subjects', async (req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();

    // Transform subjects to match frontend format
    const subjectsData = subjects.map((subject, index) => ({
      id: index + 1,
      name: subject.name,
      entries: subject.timetableEntries.map((entry, entryIndex) =>
        transformTimetableEntry(entry, (index + 1) * 1000 + entryIndex)
      )
    }));

    res.json(subjectsData);
  } catch (error: any) {
    console.error('Error loading subjects:', error);
    res.status(500).json({
      error: 'Failed to load subjects',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get specific subject by name
app.get('/subjects/:name', async (req: Request, res: Response) => {
  try {
    const subjectName = decodeURIComponent(req.params.name);
    const subject = await getSubject(subjectName);

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found',
        message: `No subject found with name: ${subjectName}`,
      });
    }

    res.json({
      success: true,
      data: {
        name: subject.name,
        code: subject.code,
        timetableEntries: subject.timetableEntries,
        entriesCount: subject.timetableEntries.length,
      },
    });
  } catch (error: any) {
    console.error('Error loading subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load subject',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Search subjects
app.get('/subjects/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Missing search term',
        message: 'Please provide a search term using ?q=yourSearchTerm',
      });
    }

    const results = await searchSubjects(searchTerm);

    res.json({
      success: true,
      data: {
        subjects: results.map(subject => ({
          name: subject.name,
          code: subject.code,
          entriesCount: subject.timetableEntries.length,
        })),
        totalResults: results.length,
        searchTerm,
      },
    });
  } catch (error: any) {
    console.error('Error searching subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search subjects',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get all subjects - matches frontend API spec
app.get('/subjects', async (req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();

    // Transform to frontend format with entries
    let globalEntryId = 1;
    const subjectsData = subjects.map((subject, index) => ({
      id: index + 1,
      name: subject.name,
      entries: subject.timetableEntries.map(entry =>
        transformTimetableEntry(entry, globalEntryId++)
      )
    }));

    res.json(subjectsData);
  } catch (error: any) {
    console.error('Error loading subjects:', error);
    res.status(500).json({
      error: 'Failed to load subjects',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get all teachers - matches frontend API spec
app.get('/teachers', async (req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();

    // Extract unique teacher names from all subjects
    const teacherSet = new Set<string>();
    subjects.forEach(subject => {
      subject.timetableEntries.forEach(entry => {
        if (entry.teacher && entry.teacher.trim() !== '') {
          teacherSet.add(entry.teacher.trim());
        }
      });
    });

    // Convert to array and return as objects with name property
    const teachers = Array.from(teacherSet)
      .sort()
      .map(name => ({ name }));

    res.json(teachers);
  } catch (error: any) {
    console.error('Error loading teachers:', error);
    res.status(500).json({
      error: 'Failed to load teachers',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get teacher timetable - matches frontend API spec
app.get('/teacher/:teacherName/timetable', async (req: Request, res: Response) => {
  try {
    const teacherName = decodeURIComponent(req.params.teacherName);
    const subjects = await getAllSubjects();

    // Find all entries for this teacher
    const teacherEntries: any[] = [];
    let entryId = 1;

    subjects.forEach(subject => {
      subject.timetableEntries.forEach(entry => {
        if (entry.teacher && entry.teacher.trim() === teacherName) {
            teacherEntries.push(transformTimetableEntry(entry, entryId++));
        }
      });
    });

      // Deduplicate entries by day, start, end, subject, type, room, format
      const seen = new Set();
      const dedupedEntries = teacherEntries.filter(entry => {
        const key = [
          entry.day,
          entry.interval.start.hour,
          entry.interval.start.minute,
          entry.interval.end.hour,
          entry.interval.end.minute,
          entry.subjectName,
          entry.type,
          entry.room,
          entry.format
        ].join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (dedupedEntries.length === 0) {
        return res.status(404).json({
          error: 'Resource not found',
          message: `Teacher '${teacherName}' does not exist`,
        });
      }

      res.json({
        teacherName,
        entries: dedupedEntries
      });
  } catch (error: any) {
    console.error('Error loading teacher timetable:', error);
    res.status(500).json({
      error: 'Failed to load teacher timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get field/year timetables - matches frontend API spec
app.get('/field/:fieldId/year/:year/timetables', async (req: Request, res: Response) => {
  try {
    const fieldId = parseInt(req.params.fieldId);
    const year = parseInt(req.params.year);

    if (isNaN(fieldId) || isNaN(year)) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Field ID and year must be valid integers',
      });
    }

    const fields = await getAllFields();

    // Find field by ID (1-based index)
    if (fieldId < 1 || fieldId > fields.length) {
      return res.status(404).json({
        error: 'Resource not found',
        message: `Field with ID ${fieldId} does not exist`,
      });
    }

    const field = fields[fieldId - 1];

    // Check if year exists for this field
    if (!field.years.includes(year)) {
      return res.status(404).json({
        error: 'Resource not found',
        message: `Year ${year} is not available for field '${field.name}'`,
      });
    }

    // Get the timetable URL for this field and year
    const timetableUrl = field.yearLinks.get(year);
    if (!timetableUrl) {
      return res.status(404).json({
        error: 'Resource not found',
        message: `No timetable URL found for field '${field.name}' year ${year}`,
      });
    }

    // Parse the timetable - this returns separate timetables for each group
    const groupTimetables = await parseTimetablesByGroup(timetableUrl);

    // Transform each group timetable to frontend format
    const timetables = groupTimetables.map((groupTimetable, groupIndex) => {
      const entries = groupTimetable.entries.map((entry, entryIndex) =>
        transformTimetableEntry(entry, (groupIndex + 1) * 1000 + entryIndex)
      );

      return {
        field: {
          id: fieldId,
          name: field.name,
          years: field.years
        },
        year,
        groupName: groupTimetable.groupName,
        entries
      };
    });

    res.json(timetables);
  } catch (error: any) {
    console.error('Error loading field/year timetables:', error);
    res.status(500).json({
      error: 'Failed to load timetables',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Parse a single timetable
app.get('/parse', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid URL parameter',
        message: 'Please provide a valid URL as a query parameter: ?url=<timetable_url>',
        example: '/parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',
      });
    }

    console.log(`[${new Date().toISOString()}] Parsing timetable from: ${url}`);

    const timetable = await parseTimetable(url);
    const hash = createTimetableHash(timetable);

    res.json({
      success: true,
      data: timetable,
      metadata: {
        hash,
        entriesCount: timetable.entries.length,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error parsing timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse timetable',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Parse multiple timetables
app.post('/parse-multiple', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid URLs array',
        message: 'Please provide an array of URLs in the request body',
        example: { urls: ['url1', 'url2', 'url3'] },
      });
    }

    if (urls.some((url) => typeof url !== 'string')) {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'All URLs must be strings',
      });
    }

    console.log(`[${new Date().toISOString()}] Parsing ${urls.length} timetables...`);

    const timetables = await parseMultipleTimetables(urls);

    const results = timetables.map((timetable) => ({
      ...timetable,
      hash: createTimetableHash(timetable),
      entriesCount: timetable.entries.length,
    }));

    res.json({
      success: true,
      data: results,
      metadata: {
        requested: urls.length,
        successful: timetables.length,
        failed: urls.length - timetables.length,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error parsing multiple timetables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse timetables',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Export timetable to JSON (from previously parsed data)
app.post('/export', async (req: Request, res: Response) => {
  try {
    const { timetable, pretty = true } = req.body;

    if (!timetable) {
      return res.status(400).json({
        error: 'Missing timetable data',
        message: 'Please provide timetable data in the request body',
      });
    }

    const jsonData = exportToJson(timetable as Timetable, pretty);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=timetable.json');
    res.send(jsonData);
  } catch (error: any) {
    console.error('Error exporting timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get example URLs for testing
app.get('/example-urls', (req: Request, res: Response) => {
  res.json({
    description: 'Example timetable URLs from UBB Cluj Computer Science faculty',
    baseUrl: 'https://www.cs.ubbcluj.ro/files/orar/',
    urlPattern: '{baseUrl}{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR_OF_STUDY}.html',
    examples: {
      'MIE Year 3, Semester 1, 2025': 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',
      'CTI Year 1, Semester 1, 2025': 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/CTI1.html',
      'INFO Year 4, Semester 2, 2024': 'https://www.cs.ubbcluj.ro/files/orar/2024-2/tabelar/INFO4.html',
    },
    specializations: ['MIE', 'CTI', 'INFO', 'MI'],
    yearsOfStudy: [1, 2, 3, 4],
    semesters: [1, 2],
  });
});

// ============== NOTIFICATION ENDPOINTS ==============

// Get notifications with filtering and pagination
app.get('/notifications', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      type,
      read,
      priority,
      limit,
      offset,
      since
    } = req.query;

    const query = {
      userId: userId as string,
      type: type as any,
      read: read !== undefined ? read === 'true' : undefined,
      priority: priority as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      since: since as string
    };

    const result = await getNotifications(query);

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: query.limit || 50,
        offset: query.offset || 0,
        hasMore: result.hasMore
      }
    });
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Create a new notification
app.post('/notifications', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      data,
      priority,
      expiresAt,
      actionUrl,
      actionText
    } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, type, title, and message are required',
      });
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      message,
      data,
      priority,
      expiresAt,
      actionUrl,
      actionText
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get notification statistics
app.get('/notifications/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const stats = await getNotificationStats(userId as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get specific notification by ID
app.get('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await getNotificationById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: `No notification found with ID: ${id}`,
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await markAsRead(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: `No notification found with ID: ${id}`,
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Mark all notifications as read for a user
app.put('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    const count = await markAllAsRead(userId);

    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      data: { markedCount: count },
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Delete a notification
app.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await deleteNotification(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: `No notification found with ID: ${id}`,
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Create schedule change notification (convenience endpoint)
app.post('/notifications/schedule-change', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      changeType,
      subject,
      oldValue,
      newValue,
      date
    } = req.body;

    if (!userId || !changeType || !subject || !oldValue || !newValue || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, changeType, subject, oldValue, newValue, and date are required',
      });
    }

    if (!['room', 'time', 'teacher', 'cancelled'].includes(changeType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid changeType',
        message: 'changeType must be one of: room, time, teacher, cancelled',
      });
    }

    const notification = await createScheduleChangeNotification(
      userId,
      changeType,
      subject,
      oldValue,
      newValue,
      date
    );

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error creating schedule change notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create schedule change notification',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// === PUSH NOTIFICATION ENDPOINTS ===

// Get VAPID public key for web push subscriptions
app.get('/push/vapid-public-key', async (req: Request, res: Response) => {
  try {
    const publicKey = await pushManager.getVapidPublicKey();
    if (!publicKey) {
      return res.status(500).json({
        success: false,
        error: 'VAPID keys not configured',
        message: 'Web push notifications are not properly configured'
      });
    }

    res.json({
      success: true,
      data: { publicKey }
    });
  } catch (error: any) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get VAPID public key',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Subscribe to push notifications
app.post('/push/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and subscription are required'
      });
    }

    if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription format',
        message: 'Subscription must include endpoint and keys (p256dh, auth)'
      });
    }

    await pushManager.registerPushSubscription(userId, subscription);

    res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully'
    });
  } catch (error: any) {
    console.error('Error registering push subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register push subscription',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Unsubscribe from push notifications
app.post('/push/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { userId, subscriptionId } = req.body;

    if (!userId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and subscriptionId are required'
      });
    }

    const removed = await pushManager.removePushSubscription(userId, subscriptionId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        message: 'No subscription found with the provided ID for this user'
      });
    }

    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove push subscription',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Get push notification statistics
app.get('/push/stats', async (req: Request, res: Response) => {
  try {
    const stats = pushManager.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting push stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get push statistics',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Send push notification to specific users
app.post('/push/send', async (req: Request, res: Response) => {
  try {
    const { userIds, notification, pushPayload } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid userIds',
        message: 'userIds must be a non-empty array'
      });
    }

    if (!notification || !notification.title || !notification.message) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification',
        message: 'Notification must include title and message'
      });
    }

    // Create notification in database first
    const savedNotification = await createNotification({
      userId: userIds[0], // Use first user as primary recipient
      type: notification.type || 'system',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'normal',
      actionUrl: notification.actionUrl,
      actionText: notification.actionText
    });

    // Send push notifications to all specified users
    const promises = userIds.map(userId => 
      pushManager.sendPushNotification(userId, savedNotification, pushPayload)
    );

    await Promise.all(promises);

    res.status(201).json({
      success: true,
      message: `Push notification sent to ${userIds.length} users`,
      data: { notificationId: savedNotification.id, recipients: userIds.length }
    });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Broadcast notification to all connected users
app.post('/push/broadcast', async (req: Request, res: Response) => {
  try {
    const { notification, pushPayload, targetUsers } = req.body;

    if (!notification || !notification.title || !notification.message) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification',
        message: 'Notification must include title and message'
      });
    }

    // Create notification in database
    const savedNotification = await createNotification({
      userId: 'system', // System broadcast
      type: notification.type || 'announcement',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'normal',
      actionUrl: notification.actionUrl,
      actionText: notification.actionText
    });

    // Broadcast to all or specified users
    await pushManager.broadcastNotification(savedNotification, targetUsers);

    const recipients = targetUsers ? targetUsers.length : pushManager.getConnectedUsers().length;

    res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${recipients} users`,
      data: { notificationId: savedNotification.id, recipients }
    });
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast notification',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// === END PUSH NOTIFICATION ENDPOINTS ===

// Create hash for a timetable
app.post('/hash', async (req: Request, res: Response) => {
  try {
    const { timetable } = req.body;

    if (!timetable) {
      return res.status(400).json({
        error: 'Missing timetable data',
        message: 'Please provide timetable data in the request body',
      });
    }

    const hash = createTimetableHash(timetable as Timetable);

    res.json({
      success: true,
      hash,
      algorithm: 'SHA-256',
    });
  } catch (error: any) {
    console.error('Error creating hash:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hash',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    mainEndpoints: [
      'GET /teachers',
      'GET /fields',
      'GET /teacher/:teacherName/timetable',
      'GET /field/:fieldId/year/:year/timetables',
      'GET /subjects',
    ],
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /cache/stats',
      'POST /cache/refresh',
      'GET /fields',
      'GET /fields/:name',
      'GET /subjects',
      'GET /subjects/:name',
      'GET /subjects/search?q=term',
      'GET /teachers',
      'GET /teacher/:teacherName/timetable',
      'GET /field/:fieldId/year/:year/timetables',
      'GET /parse?url=<url>',
      'POST /parse-multiple',
      'POST /export',
      'GET /example-urls',
      'POST /hash',
      'GET /notifications',
      'POST /notifications',
      'GET /notifications/:id',
      'PUT /notifications/:id/read',
      'PUT /notifications/read-all',
      'DELETE /notifications/:id',
      'GET /notifications/stats',
      'POST /notifications/schedule-change',
    ],
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
});

// Start server
async function startServer() {
  console.log('='.repeat(60));
  console.log('🎓 UBB Timetable Parser API');
  console.log('='.repeat(60));

  // Initialize cache at startup
  try {
    await initializeCache();
  } catch (error) {
    console.error('⚠️  Warning: Failed to initialize cache at startup');
    console.error('   Cache can be initialized later via POST /cache/refresh');
    console.error('   Error:', error instanceof Error ? error.message : error);
  }

  // Initialize push notification manager
  pushManager = new PushNotificationManager(server);
  console.log('📱 Push notification manager initialized');

  server.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Cache Stats: http://localhost:${PORT}/cache/stats`);
    console.log(`📖 All Fields: http://localhost:${PORT}/fields`);
    console.log(`📚 All Subjects: http://localhost:${PORT}/subjects`);
    console.log(`📢 Notifications: http://localhost:${PORT}/notifications`);
    console.log(`📱 Push Notifications: WebSocket + Web Push enabled`);
    console.log(`🔑 VAPID Public Key: http://localhost:${PORT}/push/vapid-public-key`);
    console.log('='.repeat(60));
    
    // Set up periodic cleanup of expired notifications (every hour)
    setInterval(async () => {
      try {
        await cleanupExpiredNotifications();
      } catch (error) {
        console.error('Error during notification cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});