4. Store unique subjects in memory cache

### Deduplication
- **Fields:** Grouped by name automatically
- **Subjects:** Map ensures uniqueness by name
- **Entries:** All kept (not deduplicated)

## Rate Limiting

To respect UBB's servers:
- **Batch size:** 5 concurrent requests
- **Delay:** 100ms between batches
- **Total requests:** ~71 timetables
- **Total time:** Controlled and predictable

```typescript
// Batch processing code
const batchSize = 5;
for (let i = 0; i < urls.length; i += batchSize) {
  await Promise.all(batch.map(parseURL));
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

## Error Handling

### Startup Errors
If cache initialization fails:
- Server still starts normally
- Error logged to console
- Cache can be initialized manually via `POST /cache/refresh`

### Timetable Parse Errors
If individual timetables fail:
- Error logged
- Processing continues
- Failed count shown in summary
- Cache still contains successful data

## Example: Complete Flow

```typescript
// 1. Server starts
await initializeCache();

// Behind the scenes:
// - Fetches index.html
// - Finds 28 fields (Informatica, Matematica, etc.)
// - Each field has years [1,2,3] with URLs
// - Total: 71 timetable URLs
// - Parses all 71 timetables
// - Extracts ~206 unique subjects
// - Each subject has array of timetable entries
// - Cache ready!

// 2. Client request
GET /subjects/search?q=analiza

// 3. Server response (instant!)
// - No HTML parsing needed
// - Direct memory lookup
// - Returns filtered results
```

## Testing

### Run Demo Script
```bash
npx ts-node src/demo-new-cache.ts
```

This will:
1. Initialize cache
2. Show statistics
3. Display sample fields
4. Display sample subjects
5. Demonstrate search
6. Show subject details

### Manual Testing

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Check cache stats:**
   ```bash
   curl http://localhost:3000/cache/stats
   ```

3. **Get all fields:**
   ```bash
   curl http://localhost:3000/fields
   ```

4. **Search subjects:**
   ```bash
   curl "http://localhost:3000/subjects/search?q=programare"
   ```

## Integration

### Frontend Integration

```typescript
// React example
useEffect(() => {
  // Get all fields on mount
  fetch('http://localhost:3000/fields')
    .then(res => res.json())
    .then(data => setFields(data.data.fields));
    
  // Search subjects
  fetch('http://localhost:3000/subjects/search?q=analiza')
    .then(res => res.json())
    .then(data => setSearchResults(data.data.subjects));
}, []);
```

### Flutter Integration

```dart
// Fetch fields
Future<List<Field>> fetchFields() async {
  final response = await http.get(
    Uri.parse('http://localhost:3000/fields')
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return data['data']['fields'].map((f) => Field.fromJson(f)).toList();
  }
  throw Exception('Failed to load fields');
}

// Search subjects
Future<List<Subject>> searchSubjects(String query) async {
  final response = await http.get(
    Uri.parse('http://localhost:3000/subjects/search?q=$query')
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return data['data']['subjects'].map((s) => Subject.fromJson(s)).toList();
  }
  throw Exception('Failed to search subjects');
}
```

## Maintenance

### When to Refresh Cache

- **New semester starts** - Different subjects/schedules
- **Timetable updates** - UBB updates website
- **Manual trigger** - POST /cache/refresh

### Cache Lifespan

- **Persistent in memory** until server restart
- **Automatic refresh** on every server start
- **Manual refresh** via API endpoint

## Summary

✅ **Automatic initialization** at server startup  
✅ **Two-stage caching** (Fields → Subjects)  
✅ **In-memory singleton** for fast access  
✅ **Subject-entry association** maintained  
✅ **Unique subjects** globally cached  
✅ **Rate-limited** batch processing  
✅ **Error tolerant** - continues on failures  
✅ **API accessible** via REST endpoints  
✅ **Production ready** with full error handling  

The system is now ready for production use! 🚀
# Field & Subject Caching System

## Overview

The advanced caching system automatically fetches and caches all fields (specializations) and subjects at server startup. **All data is saved to JSON files** in the `cache/` directory for persistence and fast access.

## Architecture

### Two-Stage Caching Process with JSON Storage

```
Server Startup
    ↓
┌──────────────────────────────────────┐
│ STEP 1: Field Caching                │
│  - Fetch index.html                  │
│  - Parse all specializations         │
│  - Group by field name               │
│  - Save to cache/fields.json         │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ STEP 2: Subject Caching              │
│  - Iterate all field year links      │
│  - Parse each timetable (batched)    │
│  - Extract subjects                  │
│  - Associate entries with subjects   │
│  - Save to cache/subjects.json       │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Save Metadata                         │
│  - Save to cache/metadata.json       │
└──────────────────────────────────────┘
    ↓
Cache Ready (JSON files on disk)
```

## Cache Files

### Directory Structure
```
backend/
  cache/
    fields.json       # All fields with years and URLs
    subjects.json     # All subjects with timetable entries
    metadata.json     # Cache metadata (timestamps, counts)
```

## Data Structures

### Field
```typescript
{
  name: string;              // "Informatica - linia de studiu romana"
  years: number[];           // [1, 2, 3]
  yearLinks: Map<number, string>  // 1 → "https://.../I1.html"
                                   // 2 → "https://.../I2.html"
                                   // 3 → "https://.../I3.html"
}
```

### Subject (Optional_subject)
```typescript
{
  name: string;              // "Programare Orientata pe Obiecte"
  code: string;              // "" (not available in HTML)
  timetableEntries: [        // All entries for this subject
    {
      day: "Luni",
      hours: "08:00-10:00",
      room: "C309",
      teacher: "Prof. Popescu",
      type: "Curs",
      group: "INFO3",
      frequency: "sapt. 1-14"
    },
    // ... more entries
  ]
}
```

## API Endpoints

### Cache Management

#### GET /cache/stats
Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "isInitialized": true,
    "lastUpdated": "2025-11-02T14:30:00.000Z",
    "fieldsCount": 28,
    "subjectsCount": 206,
    "totalTimetableEntries": 1542
  }
}
```

#### POST /cache/refresh
Manually refresh the entire cache.

**Response:**
```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "data": {
    "isInitialized": true,
    "lastUpdated": "2025-11-02T14:35:00.000Z",
    "fieldsCount": 28,
    "subjectsCount": 206,
    "totalTimetableEntries": 1542
  }
}
```

### Fields

#### GET /fields
Get all cached fields.

**Response:**
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "name": "Informatica - linia de studiu romana",
        "years": [1, 2, 3],
        "yearLinks": {
          "1": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I1.html",
          "2": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I2.html",
          "3": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I3.html"
        }
      }
    ],
    "totalFields": 28
  }
}
```

#### GET /fields/:name
Get specific field by name (URL-encoded).

**Example:**
```bash
GET /fields/Informatica%20-%20linia%20de%20studiu%20romana
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Informatica - linia de studiu romana",
    "years": [1, 2, 3],
    "yearLinks": {
      "1": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I1.html",
      "2": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I2.html",
      "3": "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/I3.html"
    }
  }
}
```

### Subjects

#### GET /subjects
Get all cached subjects (summary).

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "name": "Programare Orientata pe Obiecte",
        "code": "",
        "entriesCount": 12
      },
      {
        "name": "Baze de Date",
        "code": "",
        "entriesCount": 8
      }
    ],
    "totalSubjects": 206
  }
}
```

#### GET /subjects/:name
Get specific subject with all timetable entries.

**Example:**
```bash
GET /subjects/Programare%20Orientata%20pe%20Obiecte
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Programare Orientata pe Obiecte",
    "code": "",
    "timetableEntries": [
      {
        "day": "Luni",
        "hours": "08:00-10:00",
        "frequency": "sapt. 1-14",
        "room": "C309",
        "group": "INFO3",
        "type": "Curs",
        "subject": "Programare Orientata pe Obiecte",
        "teacher": "Prof. Popescu Ion"
      }
    ],
    "entriesCount": 12
  }
}
```

#### GET /subjects/search?q=searchTerm
Search subjects by partial name.

**Example:**
```bash
GET /subjects/search?q=programare
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "name": "Programare Orientata pe Obiecte",
        "code": "",
        "entriesCount": 12
      },
      {
        "name": "Programare Web",
        "code": "",
        "entriesCount": 8
      }
    ],
    "totalResults": 2,
    "searchTerm": "programare"
  }
}
```

## Usage in Code

### Initialize Cache at Startup
```typescript
import { initializeCache } from './cache-manager';

// In server startup
await initializeCache();
```

### Access Cached Data
```typescript
import { 
  getAllFields, 
  getField, 
  getAllSubjects, 
  getSubject,
  searchSubjects,
  getCacheStats 
} from './cache-manager';

// Get all fields
const fields = getAllFields();

// Get specific field
const field = getField('Informatica - linia de studiu romana');

// Get all subjects
const subjects = getAllSubjects();

// Get specific subject
const subject = getSubject('Programare Orientata pe Obiecte');

// Search subjects
const results = searchSubjects('analiza');

// Get stats
const stats = getCacheStats();
```

## Performance

### Initialization Time
- **~71 timetables** to process
- **Batch processing** (5 concurrent requests)
- **Rate limiting** (100ms delay between batches)
- **Total time:** ~30-60 seconds

### Memory Usage
- **Fields:** ~28 objects with URLs
- **Subjects:** ~206 objects
- **Timetable Entries:** ~1500+ entries
- **Total:** Minimal memory footprint (<10MB)

### Benefits
- ✅ **Persistent storage** - Survives server restarts
- ✅ **JSON files** - Easy to inspect and debug
- ✅ **Fast access** - Load from disk instead of parsing HTML
- ✅ **Global cache** - All subjects across all fields
- ✅ **Subject-entry association** - Each subject knows its entries
- ✅ **Unique subjects** - No duplicates
- ✅ **No memory overhead** - Data loaded on demand from files

## Caching Strategy

### Step 1: Field Caching
1. Fetch `index.html` from UBB website
2. Parse specializations using `specialization-parser`
3. Group by field name (multiple years same field)
4. Create Field objects with year → URL mappings
5. Store in memory cache

### Step 2: Subject Caching
1. Collect all timetable URLs from all fields
2. Process in batches of 5 (respect rate limits)
3. For each timetable:
   - Parse HTML
   - Extract all entries
   - For each entry:
     - Get/create subject by name
     - Add entry to subject's timetableEntries array

