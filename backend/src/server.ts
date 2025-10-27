import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  parseTimetable,
  parseMultipleTimetables,
  exportToJson,
  createTimetableHash,
} from './timetable-parser';
import { Timetable } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API documentation
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'UBB Timetable Parser API',
    version: '1.0.0',
    description: 'REST API for parsing UBB Cluj timetable HTML pages',
    endpoints: {
      'GET /': 'API documentation (this page)',
      'GET /health': 'Health check endpoint',
      'GET /parse': 'Parse a single timetable (requires ?url=<timetable_url>)',
      'POST /parse-multiple': 'Parse multiple timetables (requires JSON body with urls array)',
      'GET /example-urls': 'Get example timetable URLs',
    },
    usage: {
      singleParse: 'GET /parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',
      multipleParse: 'POST /parse-multiple with body: { "urls": ["url1", "url2"] }',
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
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /parse?url=<url>',
      'POST /parse-multiple',
      'POST /export',
      'GET /example-urls',
      'POST /hash',
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
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎓 UBB Timetable Parser API');
  console.log('='.repeat(60));
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});