# Quick Reference: Frontend-Compatible API Endpoints

## Base URL
```
http://localhost:3000
```

## Main Endpoints

### 1. Get All Teachers
```bash
GET /teachers
```
**Response:** Array of `{ "name": "Teacher Name" }`

### 2. Get All Fields
```bash
GET /fields
```
**Response:** Array of `{ "id": 1, "name": "Field Name", "years": [1, 2, 3] }`

### 3. Get Teacher's Timetable
```bash
GET /teacher/{teacherName}/timetable
```
**Example:**
```bash
curl "http://localhost:3000/teacher/Prof.%20John%20Smith/timetable"
```
**Response:** 
```json
{
  "teacherName": "Prof. John Smith",
  "entries": [...]
}
```

### 4. Get Field/Year Group Timetables
```bash
GET /field/{fieldId}/year/{year}/timetables
```
**Example:**
```bash
curl "http://localhost:3000/field/1/year/2/timetables"
```
**Response:** Array of group timetables

### 5. Get All Subjects
```bash
GET /subjects
```
**Response:** Array of `{ "id": 1, "name": "Subject Name", "entries": [...] }`

## Entry Object Format

All timetable entries follow this format:
```json
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
```

## Enum Values

**Days:** `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

**Frequency:** `weekly`, `oddweeks`, `evenweeks`

**Type:** `lecture`, `seminar`, `lab`, `other`

## Testing

Run the test script:
```powershell
cd backend
.\test-endpoints.ps1
```

## PowerShell Examples

```powershell
# Get all teachers
$teachers = Invoke-RestMethod http://localhost:3000/teachers

# Get all fields
$fields = Invoke-RestMethod http://localhost:3000/fields

# Get specific teacher's timetable
$teacherName = "Prof. John Smith"
$encoded = [System.Web.HttpUtility]::UrlEncode($teacherName)
$timetable = Invoke-RestMethod "http://localhost:3000/teacher/$encoded/timetable"

# Get field/year timetables
$timetables = Invoke-RestMethod "http://localhost:3000/field/1/year/2/timetables"

# Get all subjects
$subjects = Invoke-RestMethod http://localhost:3000/subjects
```

## Notes

- All endpoints return plain JSON arrays or objects (no wrapper objects)
- Field IDs start at 1 (not 0)
- Teacher names in URLs must be URL-encoded
- All responses match the frontend Flutter app specification exactly
- No changes were made to the frontend directory

