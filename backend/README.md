# UBB Timetable Parser API

A REST API for parsing UBB Cluj timetable HTML pages into structured JSON data.

## Features

- 🎯 Parse single or multiple timetable URLs
- 📊 Extract course information including day, time, subject, teacher, room, and type
- 🔒 Generate SHA-256 hashes for timetable comparison
- 📤 Export timetables to JSON format
- 🚀 Fast and efficient parsing using Cheerio
- 🔄 Support for batch processing multiple timetables

## Installation

```bash
# Install dependencies
npm install

# For development with auto-reload
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## API Endpoints

### 1. Root Endpoint (Documentation)
```
GET /
```
Returns API documentation and available endpoints.

### 2. Health Check
```
GET /health
```
Returns server health status and uptime.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "uptime": 123.456
}
```

### 3. Parse Single Timetable
```
GET /parse?url=<timetable_url>
```

Parses a single timetable from the provided URL.

**Example:**
```bash
curl "http://localhost:3000/parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "academicYear": "2025",
    "semester": "1",
    "specialization": "MIE",
    "yearOfStudy": "3",
    "entries": [
      {
        "day": "Luni",
        "hours": "8-10",
        "frequency": "sapt. 1",
        "room": "DPPD-205",
        "group": "MIE3",
        "type": "Curs",
        "subject": "Instruire asistata de calculator",
        "teacher": "Drd. MAIER Mariana"
      }
    ]
  },
  "metadata": {
    "hash": "a1b2c3d4...",
    "entriesCount": 15,
    "parsedAt": "2025-10-27T12:00:00.000Z"
  }
}
```

### 4. Parse Multiple Timetables
```
POST /parse-multiple
```

Parses multiple timetables in parallel.

**Request Body:**
```json
{
  "urls": [
    "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html",
    "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/CTI3.html"
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/parse-multiple \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"]}'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "academicYear": "2025",
      "semester": "1",
      "specialization": "MIE",
      "yearOfStudy": "3",
      "entries": [...],
      "hash": "a1b2c3d4...",
      "entriesCount": 15
    }
  ],
  "metadata": {
    "requested": 2,
    "successful": 2,
    "failed": 0,
    "parsedAt": "2025-10-27T12:00:00.000Z"
  }
}
```

### 5. Export Timetable to JSON
```
POST /export
```

Exports a timetable object to formatted JSON.

**Request Body:**
```json
{
  "timetable": {
    "academicYear": "2025",
    "semester": "1",
    "specialization": "MIE",
    "yearOfStudy": "3",
    "entries": [...]
  },
  "pretty": true
}
```

### 6. Get Example URLs
```
GET /example-urls
```

Returns example timetable URLs and URL pattern information.

**Response:**
```json
{
  "description": "Example timetable URLs from UBB Cluj Computer Science faculty",
  "baseUrl": "https://www.cs.ubbcluj.ro/files/orar/",
  "urlPattern": "{baseUrl}{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR_OF_STUDY}.html",
  "examples": {
    "MIE Year 3, Semester 1, 2025": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html",
    "CTI Year 1, Semester 1, 2025": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/CTI1.html"
  },
  "specializations": ["MIE", "CTI", "INFO", "MI"],
  "yearsOfStudy": [1, 2, 3, 4],
  "semesters": [1, 2]
}
```

### 7. Create Hash
```
POST /hash
```

Generates a SHA-256 hash for a timetable to detect changes.

**Request Body:**
```json
{
  "timetable": {
    "academicYear": "2025",
    "semester": "1",
    "specialization": "MIE",
    "yearOfStudy": "3",
    "entries": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "hash": "a1b2c3d4e5f6...",
  "algorithm": "SHA-256"
}
```

## URL Pattern

UBB timetables follow this URL structure:
```
https://www.cs.ubbcluj.ro/files/orar/{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR_OF_STUDY}.html
```

Where:
- `YEAR`: Academic year (e.g., 2025)
- `SEMESTER`: Semester number (1 or 2)
- `SPECIALIZATION`: Program code (MIE, CTI, INFO, MI)
- `YEAR_OF_STUDY`: Year of study (1, 2, 3, or 4)

## Data Structure

### Timetable Entry
```typescript
interface TimetableEntry {
  day: string;           // e.g., "Luni", "Marti"
  hours: string;         // e.g., "8-10", "14-16"
  frequency: string;     // e.g., "sapt. 1", "sapt. 1,2"
  room: string;          // e.g., "DPPD-205", "V15"
  group: string;         // e.g., "MIE3", "MIE3/1"
  type: string;          // e.g., "Curs", "Laborator", "Seminar"
  subject: string;       // e.g., "Programare orientata obiect"
  teacher: string;       // e.g., "Lect.dr. VESCAN Andreas"
}
```

### Timetable
```typescript
interface Timetable {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
  entries: TimetableEntry[];
}
```

## Error Handling

All endpoints return structured error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Stack trace (only in development mode)"
}
```

Common HTTP status codes:
- `200 OK`: Success
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Route not found
- `500 Internal Server Error`: Server or parsing error

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `DEBUG_PARSER`: Enable parser debug logs (set to any value)

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test
```

## Tech Stack

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Axios**: HTTP client for fetching timetables
- **Cheerio**: Fast HTML parsing
- **CORS**: Cross-origin resource sharing

## License

ISC

