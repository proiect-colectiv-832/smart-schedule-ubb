# Backend API Migration Summary

## Overview
The backend API has been successfully modified to match the frontend API specification documented in `frontend/smart_schedule/README.md`. All endpoints now return data in the exact format expected by the Flutter frontend application.

## Changes Made

### 1. Modified Endpoints

#### GET /fields
**Before:**
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "name": "Computer Science",
        "years": [1, 2, 3, 4],
        "yearLinks": { "1": "url1", "2": "url2" }
      }
    ],
    "totalFields": 32
  }
}
```

**After (Frontend-compatible):**
```json
[
  {
    "id": 1,
    "name": "Computer Science",
    "years": [1, 2, 3, 4]
  },
  {
    "id": 2,
    "name": "Mathematics",
    "years": [1, 2, 3]
  }
]
```

#### GET /subjects
**Before:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "name": "Data Structures",
        "code": "",
        "entriesCount": 15
      }
    ],
    "totalSubjects": 210
  }
}
```

**After (Frontend-compatible):**
```json
[
  {
    "id": 1,
    "name": "Data Structures",
    "entries": [
      {
        "id": 1001,
        "day": "monday",
        "interval": {
          "start": { "hour": 8, "minute": 0 },
          "end": { "hour": 10, "minute": 0 }
        },
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

### 2. New Endpoints

#### GET /teachers
Returns a list of all unique teachers extracted from the cached subjects.

**Response:**
```json
[
  { "name": "Prof. John Smith" },
  { "name": "Dr. Jane Doe" },
  { "name": "Prof. Alice Johnson" }
]
```

#### GET /teacher/{teacherName}/timetable
Returns the complete teaching schedule for a specific teacher.

**URL Parameter:**
- `teacherName`: Teacher's name (URL encoded)

**Response:**
```json
{
  "teacherName": "Prof. John Smith",
  "entries": [
    {
      "id": 1,
      "day": "monday",
      "interval": {
        "start": { "hour": 8, "minute": 0 },
        "end": { "hour": 10, "minute": 0 }
      },
      "subjectName": "Data Structures",
      "teacher": "Prof. John Smith",
      "frequency": "weekly",
      "type": "lecture",
      "room": "Room A101",
      "format": "In-person"
    }
  ]
}
```

#### GET /field/{fieldId}/year/{year}/timetables
Returns all group timetables for a specific field and year.

**URL Parameters:**
- `fieldId`: Field ID (1-based index)
- `year`: Year of study

**Response:**
```json
[
  {
    "field": {
      "id": 1,
      "name": "Computer Science",
      "years": [1, 2, 3, 4]
    },
    "year": 2,
    "groupName": "Group 221",
    "entries": [
      {
        "id": 2001,
        "day": "monday",
        "interval": {
          "start": { "hour": 8, "minute": 0 },
          "end": { "hour": 10, "minute": 0 }
        },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room A101",
        "format": "In-person"
      }
    ]
  },
  {
    "field": {
      "id": 1,
      "name": "Computer Science",
      "years": [1, 2, 3, 4]
    },
    "year": 2,
    "groupName": "Group 222",
    "entries": [...]
  }
]
```

### 3. Helper Function Added

A new `transformTimetableEntry()` helper function was added to convert internal timetable entries to the frontend format. This function:

- Parses time intervals (e.g., "8-10" → `{start: {hour: 8, minute: 0}, end: {hour: 10, minute: 0}}`)
- Normalizes day names (Romanian → English lowercase: "luni" → "monday")
- Normalizes frequency values ("săpt" → "weekly", "s1" → "oddweeks", "s2" → "evenweeks")
- Normalizes class types ("curs" → "lecture", "seminar" → "seminar", "laborator" → "lab")
- Adds unique IDs to each entry
- Sets default format as "In-person"

## Data Transformations

### Day Mapping
- `luni/marti/miercuri/joi/vineri/sambata/duminica` → `monday/tuesday/wednesday/thursday/friday/saturday/sunday`

### Frequency Mapping
- `sapt/săpt` → `weekly`
- `s1/odd` → `oddweeks`
- `s2/even` → `evenweeks`

### Type Mapping
- `curs/c` → `lecture`
- `seminar/s` → `seminar`
- `laborator/lab/l` → `lab`

### Time Interval Transformation
- Input: `"8-10"` or `"8:00-10:00"`
- Output: `{ start: { hour: 8, minute: 0 }, end: { hour: 10, minute: 0 } }`

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK` - Successful request
- `400 Bad Request` - Invalid parameters (e.g., non-numeric field ID)
- `404 Not Found` - Resource not found (teacher, field, year doesn't exist)
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "error": "Resource not found",
  "message": "Teacher 'Prof. Unknown' does not exist"
}
```

## Testing

A test script `test-endpoints.ps1` has been created to verify all endpoints:

```powershell
.\test-endpoints.ps1
```

This tests:
1. GET /teachers
2. GET /fields
3. GET /subjects
4. GET /teacher/{teacherName}/timetable
5. GET /field/{fieldId}/year/{year}/timetables

## Backward Compatibility

The following existing endpoints remain unchanged and continue to work:
- GET /health
- GET /cache/stats
- POST /cache/refresh
- GET /fields/:name (get field by name)
- GET /subjects/:name (get subject by name)
- GET /subjects/search
- POST /parse-multiple
- All notification endpoints
- All push notification endpoints

## Files Modified

1. **backend/src/server.ts**
   - Added `transformTimetableEntry()` helper function
   - Modified `/fields` endpoint
   - Modified `/subjects` endpoint
   - Added `/teachers` endpoint
   - Added `/teacher/:teacherName/timetable` endpoint
   - Added `/field/:fieldId/year/:year/timetables` endpoint
   - Updated API documentation in root endpoint
   - Updated 404 handler with new endpoints

2. **backend/src/types.ts**
   - No changes (TimetableEntry interface was already properly exported)

## Frontend Compatibility

✅ All endpoints now match the exact specification in `frontend/smart_schedule/README.md`
✅ Response formats are identical to the documented examples
✅ Field IDs are 1-based indices as expected
✅ Entry IDs are globally unique
✅ Day, frequency, and type enums match frontend expectations
✅ Time format uses hour/minute objects
✅ Error responses follow the documented format

## Next Steps

The backend is now fully compatible with the frontend Flutter application. The frontend can:
1. Fetch and display all teachers
2. Fetch and display all fields with their years
3. View a teacher's complete timetable
4. View all group timetables for a specific field and year
5. Browse and add individual subjects to personalized timetables

## Server Status

Server running at: **http://localhost:3000**

Main endpoints:
- `GET /teachers`
- `GET /fields`
- `GET /teacher/{teacherName}/timetable`
- `GET /field/{fieldId}/year/{year}/timetables`
- `GET /subjects`

