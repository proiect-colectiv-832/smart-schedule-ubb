# Complete Summary: Backend API Updates

## Overview
The backend has been updated with two major improvements:
1. **Frontend API Compatibility** - All endpoints now match the Flutter frontend specification
2. **Multi-Group Timetable Parsing** - Correctly extracts ALL timetables from pages (one per group)

---

## Part 1: Frontend API Compatibility

### Modified Endpoints

#### 1. GET /fields
**Response Format:**
```json
[
  { "id": 1, "name": "Computer Science", "years": [1, 2, 3, 4] },
  { "id": 2, "name": "Mathematics", "years": [1, 2, 3] }
]
```

#### 2. GET /subjects
**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Data Structures",
    "entries": [
      {
        "id": 1001,
        "day": "monday",
        "interval": { "start": { "hour": 8, "minute": 0 }, "end": { "hour": 10, "minute": 0 } },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room A101",
        "format": "In-person"
      }
    ]
  }
]
```

### New Endpoints

#### 3. GET /teachers
**Response:**
```json
[
  { "name": "Prof. John Smith" },
  { "name": "Dr. Jane Doe" }
]
```

#### 4. GET /teacher/{teacherName}/timetable
**Response:**
```json
{
  "teacherName": "Prof. John Smith",
  "entries": [...]
}
```

#### 5. GET /field/{fieldId}/year/{year}/timetables
**Response:**
```json
[
  {
    "field": { "id": 1, "name": "Computer Science", "years": [1, 2, 3, 4] },
    "year": 2,
    "groupName": "Group 221",
    "entries": [...]
  },
  {
    "field": { "id": 1, "name": "Computer Science", "years": [1, 2, 3, 4] },
    "year": 2,
    "groupName": "Group 222",
    "entries": [...]
  }
]
```

### Data Transformations

The `transformTimetableEntry()` helper function handles:
- **Time parsing**: "8-10" → `{start: {hour: 8, minute: 0}, end: {hour: 10, minute: 0}}`
- **Day normalization**: "luni" → "monday"
- **Frequency normalization**: "săpt" → "weekly", "s1" → "oddweeks", "s2" → "evenweeks"
- **Type normalization**: "curs" → "lecture", "seminar" → "seminar", "laborator" → "lab"

---

## Part 2: Multi-Group Timetable Parsing

### Problem Solved
The original parser was only extracting the **first timetable** from each page, even though pages contain **multiple timetables** (one per student group). This caused data loss and incorrect group assignments.

### Key Understanding

**Each `<table>` element on the page = ONE group.**

- The number of tables on the page = the number of groups
- Group names come from the **"group" column** values within each table
- We do NOT look at headings, patterns, or filenames to determine groups

**Example:** For "Matematica Informatica Engleza":
- **Groups:** 831 and 832 (each has its own `<table>` element)
- **NOT groups:** 831/1, 831/2, 832/1, 832/2 (these are subgroups within a group)

### Solution
Complete rewrite of timetable parsing to:
1. Find **ALL** `<table>` elements on the page
2. Extract group names from the **"group" column** values in each table
3. Create separate timetables per table (per group)

### New Functions

#### `findAllTimetableTables($: CheerioAPI)`
- Scans ALL `<table>` elements
- Identifies timetable tables (score ≥ 3)
- Returns array of all timetable tables found
- **Does NOT extract group names** - that comes from table content

#### `parseTimetablesByGroup(url: string)`
- Parses a timetable URL
- Returns separate timetables for each group
- **Recommended for new code**

**How it works:**
1. Finds all timetable tables (one per group)
2. For each table, extracts all entries
3. Determines group name by finding the most common value in the "group" column
4. Creates one timetable object per group

**Example:**
```typescript
const groupTimetables = await parseTimetablesByGroup(url);
// Returns: [
//   { groupName: "831", entries: [...] },
//   { groupName: "832", entries: [...] }
// ]
```

### Updated Functions

#### `parseTimetable(url: string)` - Backward Compatible
- Now finds and processes ALL tables (not just one)
- Combines all groups into single timetable
- **All existing code continues to work**

### Group Name Extraction

**The ONLY source of truth is the "group" column in each table.**

For each table:
1. Extract all entries and collect their "group" column values
2. Find the most common value (all entries in one table should have the same group)
3. Use that as the `groupName`
4. Fallback: if no group column, use `{specialization}{year}-{tableIndex}`

**We do NOT:**
- ❌ Look at headings (`<h2>`, `<h3>`, etc.)
- ❌ Parse text patterns ("Grupa 221", "Group 831")
- ❌ Use filename patterns ("MIE1", "MIE2")
- ❌ Try to infer from format or structure

---

## Files Modified

### 1. backend/src/server.ts
- Added `transformTimetableEntry()` helper function
- Modified `/fields` endpoint (frontend format)
- Modified `/subjects` endpoint (frontend format)
- Added `/teachers` endpoint
- Added `/teacher/{teacherName}/timetable` endpoint
- Updated `/field/{fieldId}/year/{year}/timetables` to use `parseTimetablesByGroup()`

### 2. backend/src/timetable-parser.ts
- Added `findAllTimetableTables()` function
- Updated `parseTimetable()` to process all tables
- Added `parseTimetablesByGroup()` function
- Kept `findTimetableTable()` for backward compatibility

### 3. backend/src/types.ts
- No changes needed (backward compatible)

---

## Testing

### Test Multi-Group Parsing
```bash
cd backend
npx ts-node src/test-multi-group-parsing.ts
```

### Test All Endpoints
```powershell
cd backend
.\test-endpoints.ps1
```

### Manual Testing
```powershell
# Get all fields
Invoke-RestMethod http://localhost:3000/fields

# Get all teachers
Invoke-RestMethod http://localhost:3000/teachers

# Get field/year timetables (now with proper multi-group support)
Invoke-RestMethod http://localhost:3000/field/1/year/1/timetables
```

---

## Backward Compatibility

✅ **All existing code continues to work**
✅ **Cache system unchanged** - `parseTimetable()` is backward compatible
✅ **No breaking changes** - only additions and improvements
✅ **Old endpoints still available** - `/fields/:name`, `/subjects/:name`, etc.

---

## Documentation Files

1. **API_MIGRATION_SUMMARY.md** - Frontend API compatibility details
2. **QUICK_API_REFERENCE.md** - Quick reference for developers
3. **MULTI_GROUP_PARSING.md** - Multi-group parsing implementation details
4. **test-endpoints.ps1** - PowerShell test script
5. **test-multi-group-parsing.ts** - Multi-group parsing test

---

## Key Benefits

### Frontend Compatibility
✅ Endpoints match Flutter app specification exactly
✅ No frontend changes needed
✅ Proper data formats (arrays, objects, enums)
✅ Unique IDs for all entries

### Multi-Group Parsing
✅ No data loss - ALL groups extracted
✅ Accurate group names from HTML
✅ Proper group separation
✅ Better data organization

---

## Next Steps

### For Frontend Developers
The backend is ready! Connect your Flutter app to:
- `GET /teachers`
- `GET /fields`
- `GET /teacher/{teacherName}/timetable`
- `GET /field/{fieldId}/year/{year}/timetables`
- `GET /subjects`

### For Backend Developers
- Use `parseTimetablesByGroup()` for new code requiring group separation
- `parseTimetable()` continues to work for existing code
- All group data is now accurately extracted from HTML

---

## Running the Server

```bash
cd backend
npm run dev
```

Server will start on: **http://localhost:3000**

All endpoints are documented at: **http://localhost:3000/**

---

**🎉 Backend is now fully compatible with the frontend and correctly handles multi-group timetables!**

