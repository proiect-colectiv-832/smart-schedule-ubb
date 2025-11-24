import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as http from 'http';
import {
  parseTimetable,
  parseTimetablesByGroup,
  parseMultipleTimetables,
  exportToJson,
  createTimetableHash,
} from './src/parsers/timetable-parser';
import { Timetable, TimetableEntry } from './src/types';
import {
  initializeCache,
  getAllFields,
  getField,
  getAllSubjects,
  getSubject,
  searchSubjects,
  getCacheStats
} from './src/cache/cache-manager';
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
} from './src/notifications/notification-manager';
import { NotificationType, NotificationPriority } from './src/notifications/notification-types';
import { PushNotificationManager } from './src/notifications/push-notification-manager';
import {
  initializeTokenManager,
  generateCalendarToken,
  getUserIdFromToken,
  revokeCalendarToken,
  revokeUserTokens,
  getUserTokens,
  getTokenStats
} from './src/calendar-subscription/calendar-token-manager';
import {
  initializeUserTimetableManager,
  getUserTimetable,
  saveUserTimetable,
  addUserEvent,
  updateUserEvent,
  deleteUserEvent,
  deleteUserTimetable,
  getUserTimetableStats,
  UserEvent
} from './src/calendar-subscription/user-timetable-manager';
import {
  generateICalendar,
  generateICalendarForDateRange,
  validateICalendar,
  getCalendarMetadata
} from './src/calendar-subscription/icalendar-generator';
import {
  convertTimetableEntriesToEvents,
  getDefaultSemesterDates
} from './src/calendar-subscription/timetable-to-events-converter';
import {
  initializeMongoDB,
  getDatabase,
  closeMongoDBConnection,
  isConnected
} from './src/database';
import {
  saveUserTimetable as saveUserTimetableDB,
  getUserTimetable as getUserTimetableDB,
  deleteUserTimetable as deleteUserTimetableDB,
  getUserTimetableStats as getUserTimetableStatsDB,
  createUserTimetableIndexes,
  UserTimetableEntry
} from './src/database/user-timetable-db';

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
    format: entry.group || ''  
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
      'POST /calendar/generate-token': 'Generate calendar subscription token',
      'GET /calendar/token/:token': 'Get user ID from calendar token',
      'DELETE /calendar/token/:token': 'Revoke calendar token',
      'POST /calendar/revoke': 'Revoke all tokens for a user',
      'GET /calendar/tokens': 'Get all tokens for a user',
      'GET /calendar/token-stats': 'Get statistics about calendar tokens',
      'POST /timetable/user': 'Save or update user timetable',
      'GET /timetable/user': 'Get user timetable',
      'DELETE /timetable/user': 'Delete user timetable',
      'POST /timetable/event': 'Add or update user event',
      'DELETE /timetable/event': 'Delete user event',
      'GET /timetable/stats': 'Get user timetable statistics',
      'POST /user-timetable': 'Save/update user timetable (mobile app)',
      'GET /user-timetable': 'Get user timetable from MongoDB (mobile app)',
      'DELETE /user-timetable': 'Delete user timetable from MongoDB (mobile app)',
      'GET /user-timetable/stats': 'Get user timetable statistics from MongoDB',
      'GET /icalendar/generate': 'Generate iCalendar file',
      'GET /icalendar/validate': 'Validate iCalendar file',
      'GET /icalendar/metadata': 'Get metadata from iCalendar file',
      'GET /timetable/events/default-dates': 'Get default semester dates for events',
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
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = process.env.MONGODB_URI ? await isConnected() : null;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: mongoStatus !== null ? (mongoStatus ? 'connected' : 'disconnected') : 'not configured',
    },
  });
});

// MongoDB connection status endpoint
app.get('/mongodb/status', async (req: Request, res: Response) => {
  try {
    const hasUri = !!process.env.MONGODB_URI;
    const connected = hasUri ? await isConnected() : false;
    const db = getDatabase();
    
    let details: any = {
      configured: hasUri,
      connected,
      databaseName: process.env.MONGODB_DB_NAME || 'smart-schedule',
    };

    if (hasUri) {
      if (connected && db) {
        // Try to get some database stats
        try {
          const adminDb = db.admin();
          const serverStatus = await adminDb.serverStatus();
          details.serverInfo = {
            version: serverStatus.version,
            host: serverStatus.host,
            uptime: serverStatus.uptime,
          };
          
          // List collections to verify we can access the database
          const collections = await db.listCollections().toArray();
          details.collections = collections.map((c: any) => c.name);
          details.collectionCount = collections.length;
        } catch (error) {
          details.error = error instanceof Error ? error.message : 'Unknown error';
        }
      } else {
        details.error = 'Not connected to MongoDB';
        details.connectionString = process.env.MONGODB_URI 
          ? process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
          : 'Not set';
      }
    } else {
      details.message = 'MONGODB_URI environment variable is not set';
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check MongoDB status',
      message: error.message || 'Unknown error occurred',
    });
  }
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
    const fieldsData = fields.map((field: { name: string; years: number[] }, index: number) => ({
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

    // Transform subjects to match frontend format with code as id
    let globalEntryId = 1;
    const subjectsData = subjects.map((subject: { name: string; code: string; timetableEntries: TimetableEntry[] }) => ({
      id: subject.code || `unknown-${subject.name.replace(/\s+/g, '-')}`, // Use code as id, fallback to sanitized name
      name: subject.name,
      entries: subject.timetableEntries.map((entry: TimetableEntry) =>
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
        subjects: results.map((subject: { name: string; code: string; timetableEntries: TimetableEntry[] }) => ({
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

// Get all teachers - matches frontend API spec
app.get('/teachers', async (req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();

    // Extract unique teacher names from all subjects
    const teacherSet = new Set<string>();
    subjects.forEach((subject: { name: string; code: string; timetableEntries: TimetableEntry[] }) => {
      subject.timetableEntries.forEach((entry: TimetableEntry) => {
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

    subjects.forEach((subject: { timetableEntries: TimetableEntry[] }) => {
      subject.timetableEntries.forEach((entry: TimetableEntry) => {
        if (entry.teacher && entry.teacher.trim() === teacherName) {
          teacherEntries.push(transformTimetableEntry(entry, entryId++));
        }
      });
    });

    if (teacherEntries.length === 0) {
      return res.status(404).json({
        error: 'Resource not found',
        message: `Teacher '${teacherName}' does not exist`,
      });
    }

    res.json({
      teacherName,
      entries: teacherEntries
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

// ============== CALENDAR SUBSCRIPTION ENDPOINTS ==============

// Generate calendar subscription token for a user
app.post('/calendar/generate-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    const token = await generateCalendarToken(userId);
    const subscriptionUrl = `${req.protocol}://${req.get('host')}/calendar/${token}.ics`;

    res.status(201).json({
      success: true,
      data: {
        token,
        subscriptionUrl,
        usage: {
          appleCalendar: 'Open Calendar app → File → New Calendar Subscription → paste URL',
          googleCalendar: 'Open Google Calendar → Other calendars (+) → From URL → paste URL',
          outlook: 'Open Outlook → Add Calendar → Subscribe from web → paste URL',
        }
      }
    });
  } catch (error: any) {
    console.error('Error generating calendar token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate calendar token',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get user ID from calendar token (for debugging)
app.get('/calendar/token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return res.status(404).json({
        success: false,
        error: 'Invalid token',
        message: 'Token not found or expired',
      });
    }

    res.json({
      success: true,
      data: { userId }
    });
  } catch (error: any) {
    console.error('Error getting user from token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user from token',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Revoke a calendar token
app.delete('/calendar/token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const revoked = await revokeCalendarToken(token);

    if (!revoked) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        message: 'No token found with the provided value',
      });
    }

    res.json({
      success: true,
      message: 'Calendar token revoked successfully'
    });
  } catch (error: any) {
    console.error('Error revoking calendar token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke calendar token',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Revoke all tokens for a user
app.post('/calendar/revoke', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    const count = await revokeUserTokens(userId);

    res.json({
      success: true,
      message: `Revoked ${count} tokens for user`,
      data: { revokedCount: count }
    });
  } catch (error: any) {
    console.error('Error revoking user tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke user tokens',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get all tokens for a user
app.get('/calendar/tokens', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required as query parameter',
      });
    }

    const tokens = getUserTokens(userId as string);

    res.json({
      success: true,
      data: { tokens }
    });
  } catch (error: any) {
    console.error('Error getting user tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user tokens',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get calendar token statistics
app.get('/calendar/token-stats', async (req: Request, res: Response) => {
  try {
    const stats = getTokenStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting token stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token statistics',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// ============== USER TIMETABLE MANAGEMENT ENDPOINTS ==============

// Save or update user's timetable
app.post('/timetable/user', async (req: Request, res: Response) => {
  try {
    const { userId, events, semesterStart, semesterEnd } = req.body;

    if (!userId || !events) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and events are required',
      });
    }

    const parsedSemesterStart = semesterStart ? new Date(semesterStart) : undefined;
    const parsedSemesterEnd = semesterEnd ? new Date(semesterEnd) : undefined;

    // Parse date strings in events
    const parsedEvents = events.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      recurrenceRule: event.recurrenceRule ? {
        ...event.recurrenceRule,
        until: event.recurrenceRule.until ? new Date(event.recurrenceRule.until) : undefined,
      } : undefined,
    }));

    const timetable = await saveUserTimetable(userId, parsedEvents, parsedSemesterStart, parsedSemesterEnd);

    res.json({
      success: true,
      data: timetable,
      message: 'Timetable saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving user timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get user's timetable
app.get('/timetable/user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required as query parameter',
      });
    }

    const timetable = await getUserTimetable(userId as string);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    res.json({
      success: true,
      data: timetable
    });
  } catch (error: any) {
    console.error('Error getting user timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Delete user's timetable
app.delete('/timetable/user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    const deleted = await deleteUserTimetable(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Add or update a user event
app.post('/timetable/event', async (req: Request, res: Response) => {
  try {
    const { userId, event } = req.body;

    if (!userId || !event) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and event are required',
      });
    }

    // Parse dates
    const parsedEvent = {
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      recurrenceRule: event.recurrenceRule ? {
        ...event.recurrenceRule,
        until: event.recurrenceRule.until ? new Date(event.recurrenceRule.until) : undefined,
      } : undefined,
    };

    let result: UserEvent | null;

    if (event.id) {
      // Update existing event
      result = await updateUserEvent(userId, event.id, parsedEvent);
    } else {
      // Add new event
      result = await addUserEvent(userId, parsedEvent);
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: 'Could not update event - event or user not found',
      });
    }

    res.status(event.id ? 200 : 201).json({
      success: true,
      data: result,
      message: event.id ? 'Event updated successfully' : 'Event added successfully'
    });
  } catch (error: any) {
    console.error('Error saving user event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user event',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Delete a user event
app.delete('/timetable/event', async (req: Request, res: Response) => {
  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and eventId are required',
      });
    }

    const deleted = await deleteUserEvent(userId, eventId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: 'Could not delete event - event or user not found',
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user event',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get user timetable statistics
app.get('/timetable/stats', async (req: Request, res: Response) => {
  try {
    const stats = getUserTimetableStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting timetable stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get timetable statistics',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// ============== USER TIMETABLE SYNC ENDPOINT (MongoDB) ==============

// Save/update user timetable from mobile app
app.post('/user-timetable', async (req: Request, res: Response) => {
  try {
    const { userId, entries } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        hasErrors: true,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    if (!entries || !Array.isArray(entries)) {
      return res.status(401).json({
        hasErrors: true,
        error: 'Missing or invalid entries',
        message: 'entries must be an array',
      });
    }

    // Check if MongoDB is connected
    const connected = await isConnected();
    if (!connected) {
      return res.status(500).json({
        hasErrors: true,
        error: 'Database unavailable',
        message: 'MongoDB is not connected. Please try again later.',
      });
    }

    // Validate each entry has the required structure
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const requiredFields = ['id', 'day', 'sh', 'sm', 'eh', 'em', 'subject', 'teacher', 'freq', 'type', 'room', 'format'];
      
      for (const field of requiredFields) {
        if (entry[field] === undefined || entry[field] === null) {
          return res.status(402).json({
            hasErrors: true,
            error: 'Invalid entry format',
            message: `Entry at index ${i} is missing required field: ${field}`,
          });
        }
      }
    }

    // Save the timetable
    const savedTimetable = await saveUserTimetableDB(userId, entries as UserTimetableEntry[]);

    res.status(200).json({
      hasErrors: false,
      success: true,
      message: 'Timetable saved successfully',
      data: {
        userId: savedTimetable.userId,
        entriesCount: savedTimetable.entries.length,
        updatedAt: savedTimetable.updatedAt,
      },
    });

    console.log(`✅ Saved timetable for user ${userId} (${entries.length} entries)`);
  } catch (error: any) {
    console.error('Error saving user timetable:', error);
    res.status(500).json({
      hasErrors: true,
      success: false,
      error: 'Failed to save user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get user timetable from MongoDB
app.get('/user-timetable', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        hasErrors: true,
        error: 'Missing userId',
        message: 'userId is required as query parameter',
      });
    }

    // Check if MongoDB is connected
    const connected = await isConnected();
    if (!connected) {
      return res.status(503).json({
        hasErrors: true,
        error: 'Database unavailable',
        message: 'MongoDB is not connected. Please try again later.',
      });
    }

    const timetable = await getUserTimetableDB(userId as string);

    if (!timetable) {
      return res.status(404).json({
        hasErrors: true,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    res.json({
      hasErrors: false,
      success: true,
      data: {
        userId: timetable.userId,
        entries: timetable.entries,
        createdAt: timetable.createdAt,
        updatedAt: timetable.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting user timetable:', error);
    res.status(500).json({
      hasErrors: true,
      success: false,
      error: 'Failed to get user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Delete user timetable from MongoDB
app.delete('/user-timetable', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        hasErrors: true,
        error: 'Missing userId',
        message: 'userId is required in the request body',
      });
    }

    // Check if MongoDB is connected
    const connected = await isConnected();
    if (!connected) {
      return res.status(503).json({
        hasErrors: true,
        error: 'Database unavailable',
        message: 'MongoDB is not connected. Please try again later.',
      });
    }

    const deleted = await deleteUserTimetableDB(userId);

    if (!deleted) {
      return res.status(404).json({
        hasErrors: true,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    res.json({
      hasErrors: false,
      success: true,
      message: 'Timetable deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user timetable:', error);
    res.status(500).json({
      hasErrors: true,
      success: false,
      error: 'Failed to delete user timetable',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get user timetable statistics from MongoDB
app.get('/user-timetable/stats', async (req: Request, res: Response) => {
  try {
    // Check if MongoDB is connected
    const connected = await isConnected();
    if (!connected) {
      return res.status(503).json({
        hasErrors: true,
        error: 'Database unavailable',
        message: 'MongoDB is not connected. Please try again later.',
      });
    }

    const stats = await getUserTimetableStatsDB();
    res.json({
      hasErrors: false,
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting user timetable stats:', error);
    res.status(500).json({
      hasErrors: true,
      success: false,
      error: 'Failed to get user timetable statistics',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// ============== ICALENDAR GENERATION ENDPOINTS ==============

// Serve iCalendar feed for a user (the main subscription endpoint)
app.get('/calendar/:token.ics', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const {
      language = 'ro-en',
      isTerminalYear = 'false',
      includeVacations = 'true',
      includeExamPeriods = 'true'
    } = req.query;

    // Validate token and get user ID
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return res.status(404).send('Calendar not found. The subscription link may be invalid or expired.');
    }

    // Get user's timetable
    const timetable = await getUserTimetable(userId);

    if (!timetable || timetable.events.length === 0) {
      return res.status(404).send('No events found in your timetable. Please add some events first.');
    }

    // Generate iCalendar feed with academic calendar integration
    const icalString = await generateICalendar(timetable, userId, {
      language: language as 'ro-en' | 'hu-de',
      isTerminalYear: isTerminalYear === 'true',
      includeVacations: includeVacations === 'true',
      includeExamPeriods: includeExamPeriods === 'true'
    });

    // Set proper headers for calendar subscription
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-WR-CALNAME', 'UBB Smart Schedule');
    res.setHeader('X-WR-CALDESC', 'Your personalized UBB timetable');

    res.send(icalString);

    console.log(`📅 Served calendar for user ${userId} (${timetable.events.length} events, lang: ${language}, terminal: ${isTerminalYear})`);
  } catch (error: any) {
    console.error('Error serving iCalendar:', error);
    res.status(500).send('Error generating calendar. Please try again later.');
  }
});

// Generate iCalendar for testing/preview (requires userId)
app.get('/icalendar/generate', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      startDate,
      endDate,
      format,
      language = 'ro-en',
      isTerminalYear = 'false',
      includeVacations = 'true',
      includeExamPeriods = 'true'
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required as query parameter',
      });
    }

    const timetable = await getUserTimetable(userId as string);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    const options = {
      language: language as 'ro-en' | 'hu-de',
      isTerminalYear: isTerminalYear === 'true',
      includeVacations: includeVacations === 'true',
      includeExamPeriods: includeExamPeriods === 'true'
    };

    let icalString: string;

    if (startDate && endDate) {
      icalString = await generateICalendarForDateRange(
        timetable,
        userId as string,
        new Date(startDate as string),
        new Date(endDate as string),
        options
      );
    } else {
      icalString = await generateICalendar(timetable, userId as string, options);
    }

    if (format === 'json') {
      // Return as JSON for debugging
      res.json({
        success: true,
        data: {
          icalendar: icalString,
          metadata: getCalendarMetadata(timetable),
          options: options
        }
      });
    } else {
      // Return as .ics file
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="timetable.ics"');
      res.send(icalString);
    }
  } catch (error: any) {
    console.error('Error generating iCalendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate iCalendar',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Validate an iCalendar string
app.post('/icalendar/validate', async (req: Request, res: Response) => {
  try {
    const { icalendar } = req.body;

    if (!icalendar) {
      return res.status(400).json({
        success: false,
        error: 'Missing iCalendar data',
        message: 'icalendar string is required in the request body',
      });
    }

    const validation = validateICalendar(icalendar);

    res.json({
      success: true,
      data: validation
    });
  } catch (error: any) {
    console.error('Error validating iCalendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate iCalendar',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get calendar metadata for a user
app.get('/icalendar/metadata', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required as query parameter',
      });
    }

    const timetable = await getUserTimetable(userId as string);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        error: 'Timetable not found',
        message: `No timetable found for user: ${userId}`,
      });
    }

    const metadata = getCalendarMetadata(timetable);

    res.json({
      success: true,
      data: metadata
    });
  } catch (error: any) {
    console.error('Error getting calendar metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar metadata',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// Get default semester dates
app.get('/timetable/events/default-dates', async (req: Request, res: Response) => {
  try {
    const dates = getDefaultSemesterDates();
    res.json({
      success: true,
      data: dates
    });
  } catch (error: any) {
    console.error('Error getting default dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get default semester dates',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// === END CALENDAR ENDPOINTS ===

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

  // Initialize MongoDB connection
  if (process.env.MONGODB_URI) {
    try {
      await initializeMongoDB();
      
      // Create indexes for user timetables
      try {
        await createUserTimetableIndexes();
      } catch (error) {
        console.error('⚠️  Warning: Failed to create user timetable indexes');
        console.error('   Error:', error instanceof Error ? error.message : error);
      }
    } catch (error) {
      console.error('⚠️  Warning: Failed to connect to MongoDB');
      console.error('   MongoDB connection is optional. Server will continue without it.');
      console.error('   Error:', error instanceof Error ? error.message : error);
    }
  }

  // Initialize cache at startup
  try {
    await initializeCache();
  } catch (error) {
    console.error('⚠️  Warning: Failed to initialize cache at startup');
    console.error('   Cache can be initialized later via POST /cache/refresh');
    console.error('   Error:', error instanceof Error ? error.message : error);
  }

  // Initialize calendar token manager
  try {
    await initializeTokenManager();
    console.log('🔐 Calendar token manager initialized');
  } catch (error) {
    console.error('⚠️  Warning: Failed to initialize calendar token manager');
    console.error('   Error:', error instanceof Error ? error.message : error);
  }

  // Initialize user timetable manager
  try {
    await initializeUserTimetableManager();
    console.log('📅 User timetable manager initialized');
  } catch (error) {
    console.error('⚠️  Warning: Failed to initialize user timetable manager');
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
    console.log(`📅 Calendar Subscriptions: http://localhost:${PORT}/calendar/{token}.ics`);
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

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close MongoDB connection
    await closeMongoDBConnection();
    
    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
