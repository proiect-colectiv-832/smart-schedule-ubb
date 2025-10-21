# UBB Timetable Parser

A TypeScript NPM library that fetches and parses UBB Cluj timetable HTML pages into structured JSON data.

## 🎯 Features

- **URL Parsing**: Automatically extracts metadata (academic year, semester, specialization, year of study) from UBB timetable URLs
- **HTML Parsing**: Fetches and parses timetable HTML using Cheerio
- **Structured Data**: Returns clean, typed JSON objects
- **Multiple Timetables**: Support for parsing multiple timetables at once
- **Change Detection**: Simple hashing for detecting timetable updates
- **API Server**: Express.js server with REST endpoints
- **TypeScript**: Fully typed with interfaces and declarations

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Basic Usage

```typescript
import { parseTimetable } from './src';

const timetable = await parseTimetable("https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html");

console.log(timetable.academicYear);  // "2025"
console.log(timetable.semester);     // "1"
console.log(timetable.specialization); // "MIE"
console.log(timetable.yearOfStudy);  // "3"
console.log(timetable.entries.length); // Number of timetable entries
```

### API Server

Start the server:
```bash
npm run dev  # Development mode
# or
npm run build && npm start  # Production mode
```

The server will be available at `http://localhost:3000` with the following endpoints:

- `GET /` - API documentation
- `GET /parse?url=<timetable_url>` - Parse a single timetable
- `POST /parse-multiple` - Parse multiple timetables
- `GET /example` - Get example URLs and patterns

### Example API Usage

```bash
# Parse a single timetable
curl "http://localhost:3000/parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"

# Parse multiple timetables
curl -X POST http://localhost:3000/parse-multiple \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"]}'
```

## 📊 Data Structure

### URL Pattern
```
https://www.cs.ubbcluj.ro/files/orar/{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR_OF_STUDY}.html
```

Where:
- `YEAR`: Academic year (e.g., 2025)
- `SEMESTER`: 1 (fall) or 2 (spring)
- `SPECIALIZATION`: Study program code (MIE, CTI, INFO, etc.)
- `YEAR_OF_STUDY`: Year of study (1, 2, 3, etc.)

### Output Format

```typescript
interface Timetable {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
  entries: TimetableEntry[];
}

interface TimetableEntry {
  day: string;           // "Luni", "Marți", etc.
  hours: string;         // "8-10", "10-12", etc.
  frequency: string;     // "sapt. 1", "sapt. 2", etc.
  room: string;          // "DPPD-205", "V15", etc.
  group: string;         // "MIE3", "MIE3/1", etc.
  type: string;          // "Curs", "Seminar", "Laborator"
  subject: string;       // Subject name
  teacher: string;       // Teacher name
}
```

## 🛠️ Development

### Scripts

```bash
npm run build         # Build TypeScript to JavaScript
npm run build:watch   # Build in watch mode
npm run dev          # Run example script with ts-node
npm run start        # Run built server
npm run clean        # Clean dist directory
```

### Project Structure

```
src/
├── index.ts              # Main exports
├── types.ts              # TypeScript interfaces
├── timetable-parser.ts   # Core parsing logic
├── server.ts            # Express API server
└── example.ts           # Usage examples
```

## 📚 API Reference

### Core Functions

#### `parseTimetable(url: string): Promise<Timetable>`
Fetches and parses a single UBB timetable URL.

#### `parseMultipleTimetables(urls: string[]): Promise<Timetable[]>`
Parses multiple timetable URLs concurrently.

#### `exportToJson(timetable: Timetable, pretty?: boolean): string`
Exports timetable data to JSON string.

#### `createTimetableHash(timetable: Timetable): string`
Creates a hash of timetable content for change detection.

## 🔧 Error Handling

The library includes comprehensive error handling for:
- Invalid URL formats
- Network requests failures
- Missing or malformed HTML content
- Empty or invalid table data

## 🌟 Future Enhancements

- [ ] Add unit tests with Jest
- [ ] Implement caching mechanisms
- [ ] Add support for different output formats (CSV, XML)
- [ ] Create a CLI tool
- [ ] Add data validation and sanitization
- [ ] Implement rate limiting for batch operations
- [ ] Add support for historical timetable data

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
