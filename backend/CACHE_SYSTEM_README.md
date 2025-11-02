# Subjects Cache System

## Overview

The cache system automatically fetches and stores all subjects from all UBB timetables at server startup. This provides fast access to all available subjects without needing to parse timetables on every request.

## How It Works

### Server Startup Process

1. **Fetch Specializations** - Gets all programs (Licență & Master) from UBB website
2. **Extract Timetable URLs** - Collects all year links (~65 timetables)
3. **Parse All Timetables** - Processes each timetable to extract subjects
4. **Save to Cache** - Stores unique subjects in JSON file

### Cache File

Location: `backend/cache/subjects.json`

Structure:
```json
{
  "subjects": [
    "Analiza functionala",
    "Astronomie",
    "Baze de date",
    ...
  ],
  "totalSubjects": 150,
  "lastUpdated": "2025-11-02T12:00:00.000Z",
  "timetablesProcessed": 65
}
```

## API Endpoints

### GET /subjects

Returns all cached subjects.

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": ["subject1", "subject2", ...],
    "totalSubjects": 150,
    "lastUpdated": "2025-11-02T12:00:00.000Z",
    "timetablesProcessed": 65
  }
}
```

**Example:**
```bash
curl http://localhost:3000/subjects
```

### POST /subjects/refresh

Manually refreshes the subjects cache.

**Response:**
```json
{
  "success": true,
  "message": "Subjects cache refreshed successfully",
  "data": {
    "totalSubjects": 150,
    "lastUpdated": "2025-11-02T12:00:00.000Z",
    "timetablesProcessed": 65
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/subjects/refresh
```

## Usage in Code

### Load Cache at Server Startup

```typescript
import { initializeSubjectsCache } from './cache-manager';

// At server startup
await initializeSubjectsCache();
```

### Get Cached Subjects

```typescript
import { loadSubjectsFromCache } from './cache-manager';

const cache = await loadSubjectsFromCache();
console.log(cache.subjects); // Array of all subjects
```

### Get Subjects (with auto-initialization)

```typescript
import { getSubjects } from './cache-manager';

// If cache doesn't exist, it will be created automatically
const subjects = await getSubjects();
```

## Testing

### Demo Script

Run the cache demo to test the system:

```bash
npx ts-node src/demo-cache.ts
```

This will:
1. Check for existing cache
2. Initialize/refresh cache
3. Display summary and sample subjects

### Manual Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Check cache initialization in logs:**
   - Look for: "📦 Initializing subjects cache..."
   - Progress updates every 10 timetables
   - Final summary with total subjects

3. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/subjects
   ```

4. **Refresh cache manually:**
   ```bash
   curl -X POST http://localhost:3000/subjects/refresh
   ```

## Cache Performance

### Initialization Time

- **~65 timetables** to process
- **~30-60 seconds** total time (depends on network)
- Progress shown every 10 timetables

### Benefits

- ✅ **Fast access** - No parsing needed after initialization
- ✅ **Complete data** - All subjects from all programs
- ✅ **No duplicates** - Unique subjects only
- ✅ **Sorted** - Alphabetically ordered
- ✅ **Persistent** - Saved to disk (survives server restart)

## Cache File Structure

```
backend/
  cache/
    subjects.json     # Main cache file
```

The cache directory is created automatically if it doesn't exist.

## Error Handling

### Startup Errors

If cache initialization fails at startup:
- Server still starts normally
- Error is logged to console
- Cache will be initialized on first `/subjects` request

### Runtime Errors

If individual timetables fail to parse:
- Error is logged
- Processing continues with remaining timetables
- Failed count is shown in summary

## Configuration

### Base URL

Current: `https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar`

To change semester/year, update in `cache-manager.ts`:
```typescript
const UBB_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar';
```

### Cache Location

To change cache directory, update in `cache-manager.ts`:
```typescript
const CACHE_DIR = path.join(__dirname, '..', 'cache');
```

## Integration with Frontend

### React Example

```typescript
// Fetch all subjects on component mount
useEffect(() => {
  fetch('http://localhost:3000/subjects')
    .then(res => res.json())
    .then(data => {
      setSubjects(data.data.subjects);
    });
}, []);

// Refresh cache button
const refreshCache = async () => {
  const response = await fetch('http://localhost:3000/subjects/refresh', {
    method: 'POST'
  });
  const data = await response.json();
  console.log('Cache refreshed:', data);
};
```

### Flutter Example

```dart
// Fetch subjects
Future<List<String>> fetchSubjects() async {
  final response = await http.get(
    Uri.parse('http://localhost:3000/subjects')
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return List<String>.from(data['data']['subjects']);
  }
  throw Exception('Failed to load subjects');
}
```

## Maintenance

### When to Refresh Cache

- **Start of new semester** - Different subjects may be available
- **Timetable updates** - If UBB updates their timetables
- **Manual request** - Use POST /subjects/refresh endpoint

### Cache Lifespan

The cache is persistent (saved to disk) and doesn't expire automatically. It's refreshed:
1. At server startup
2. When manually triggered via API

## Troubleshooting

### Cache not found on /subjects request

**Solution:** 
- Check server startup logs for initialization errors
- Trigger manual refresh: `POST /subjects/refresh`

### Some subjects missing

**Solution:**
- Check logs for failed timetable parsing
- Verify all timetable URLs are accessible
- Refresh cache: `POST /subjects/refresh`

### Slow initialization

**Normal behavior** - Processing 65 timetables takes time
- Monitor progress in console
- Each timetable requires HTTP request + parsing

## Future Enhancements

Possible improvements:
- ✨ Automatic cache refresh on schedule (e.g., daily)
- ✨ Cache versioning (track changes over time)
- ✨ Subject metadata (which programs/years have each subject)
- ✨ Incremental updates (only refresh changed timetables)
- ✨ Redis/database storage for production

