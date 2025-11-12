# Smart Schedule - API Documentation

This Flutter application manages university timetables for teachers and students. Below is the complete API specification showing the expected JSON formats for all endpoints.

## API Endpoints Overview

1. **GET /teachers** - Fetch list of all teachers
2. **GET /fields** - Fetch list of all fields/specializations
3. **GET /teacher/{teacherName}/timetable** - Fetch teacher's timetable
4. **GET /field/{fieldId}/year/{year}/timetables** - Fetch all group timetables for a field and year
5. **GET /subjects** - Fetch all available subjects (optional endpoint)

---

## Data Models

### Enums

```json
// Day enum values
"day": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

// Frequency enum values
"frequency": "weekly" | "oddweeks" | "evenweeks"

// Type enum values
"type": "lecture" | "seminar" | "lab" | "other"
```

### Time Format
Times should be provided as hours and minutes:
```json
{
  "hour": 8,
  "minute": 0
}
```

---

## 1. GET /teachers
**Description:** Returns a list of all teachers in the system.

**Response:**
```json
[
  {
    "name": "Prof. John Smith"
  },
  {
    "name": "Dr. Jane Doe"
  },
  {
    "name": "Prof. Alice Johnson"
  }
]
```

**Response Model:**
- Array of teacher objects
- Each object contains:
  - `name` (string): Full name of the teacher

---

## 2. GET /fields
**Description:** Returns a list of all fields/specializations with their available years.

**Response:**
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
  },
  {
    "id": 3,
    "name": "Physics",
    "years": [1, 2, 3, 4]
  }
]
```

**Response Model:**
- Array of field objects
- Each object contains:
  - `id` (integer): Unique identifier for the field
  - `name` (string): Name of the field/specialization
  - `years` (array of integers): List of available years of study

---

## 3. GET /teacher/{teacherName}/timetable
**Description:** Returns the complete teaching schedule for a specific teacher.

**URL Parameters:**
- `teacherName` (string): Name of the teacher (URL encoded)

**Example Request:** `/teacher/Prof.%20John%20Smith/timetable`

**Response:**
```json
{
  "teacherName": "Prof. John Smith",
  "entries": [
    {
      "id": 1001,
      "day": "monday",
      "interval": {
        "start": {
          "hour": 8,
          "minute": 0
        },
        "end": {
          "hour": 10,
          "minute": 0
        }
      },
      "subjectName": "Data Structures",
      "teacher": "Prof. John Smith",
      "frequency": "weekly",
      "type": "lecture",
      "room": "Room A101",
      "format": "In-person"
    },
    {
      "id": 1002,
      "day": "wednesday",
      "interval": {
        "start": {
          "hour": 14,
          "minute": 0
        },
        "end": {
          "hour": 16,
          "minute": 0
        }
      },
      "subjectName": "Data Structures",
      "teacher": "Prof. John Smith",
      "frequency": "weekly",
      "type": "seminar",
      "room": "Lab B201",
      "format": "In-person"
    },
    {
      "id": 1003,
      "day": "friday",
      "interval": {
        "start": {
          "hour": 10,
          "minute": 0
        },
        "end": {
          "hour": 12,
          "minute": 0
        }
      },
      "subjectName": "Algorithms",
      "teacher": "Prof. John Smith",
      "frequency": "oddweeks",
      "type": "lab",
      "room": "Lab C301",
      "format": "Hybrid"
    }
  ]
}
```

**Response Model:**
- Object containing:
  - `teacherName` (string): Name of the teacher
  - `entries` (array): List of timetable entries

**Entry Object:**
- `id` (integer): Unique identifier for the entry
- `day` (string): Day of the week (enum: monday, tuesday, wednesday, thursday, friday, saturday, sunday)
- `interval` (object): Time interval
  - `start` (object): Start time with `hour` (0-23) and `minute` (0-59)
  - `end` (object): End time with `hour` (0-23) and `minute` (0-59)
- `subjectName` (string): Name of the subject/course
- `teacher` (string): Name of the teacher
- `frequency` (string): How often the class occurs (enum: weekly, oddweeks, evenweeks)
- `type` (string): Type of class (enum: lecture, seminar, lab, other)
- `room` (string): Location/room number
- `format` (string): Delivery format (e.g., "In-person", "Online", "Hybrid")

---

## 4. GET /field/{fieldId}/year/{year}/timetables
**Description:** Returns all group timetables for a specific field and year of study.

**URL Parameters:**
- `fieldId` (integer): ID of the field
- `year` (integer): Year of study

**Example Request:** `/field/1/year/2/timetables`

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
          "start": {
            "hour": 8,
            "minute": 0
          },
          "end": {
            "hour": 10,
            "minute": 0
          }
        },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room A101",
        "format": "In-person"
      },
      {
        "id": 2002,
        "day": "tuesday",
        "interval": {
          "start": {
            "hour": 12,
            "minute": 0
          },
          "end": {
            "hour": 14,
            "minute": 0
          }
        },
        "subjectName": "Operating Systems",
        "teacher": "Dr. Jane Doe",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room B202",
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
    "entries": [
      {
        "id": 3001,
        "day": "monday",
        "interval": {
          "start": {
            "hour": 10,
            "minute": 0
          },
          "end": {
            "hour": 12,
            "minute": 0
          }
        },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "seminar",
        "room": "Lab B201",
        "format": "In-person"
      }
    ]
  }
]
```

**Response Model:**
- Array of group timetable objects
- Each object contains:
  - `field` (object): Field information
    - `id` (integer): Field ID
    - `name` (string): Field name
    - `years` (array): Available years
  - `year` (integer): Year of study
  - `groupName` (string): Name of the student group (e.g., "Group 221", "221A")
  - `entries` (array): List of timetable entries (same structure as teacher timetable entries)

---

## 5. GET /subjects (Optional)
**Description:** Returns all available subjects with their associated class entries. This is useful for the "Add Subjects" feature where students can browse and add individual subjects to their personalized timetable.

**Response:**
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
          "start": {
            "hour": 8,
            "minute": 0
          },
          "end": {
            "hour": 10,
            "minute": 0
          }
        },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room A101",
        "format": "In-person"
      },
      {
        "id": 1002,
        "day": "wednesday",
        "interval": {
          "start": {
            "hour": 14,
            "minute": 0
          },
          "end": {
            "hour": 16,
            "minute": 0
          }
        },
        "subjectName": "Data Structures",
        "teacher": "Prof. John Smith",
        "frequency": "weekly",
        "type": "seminar",
        "room": "Lab B201",
        "format": "In-person"
      }
    ]
  },
  {
    "id": 2,
    "name": "Operating Systems",
    "entries": [
      {
        "id": 2001,
        "day": "tuesday",
        "interval": {
          "start": {
            "hour": 12,
            "minute": 0
          },
          "end": {
            "hour": 14,
            "minute": 0
          }
        },
        "subjectName": "Operating Systems",
        "teacher": "Dr. Jane Doe",
        "frequency": "weekly",
        "type": "lecture",
        "room": "Room B202",
        "format": "In-person"
      }
    ]
  }
]
```

**Response Model:**
- Array of subject objects
- Each object contains:
  - `id` (integer): Unique identifier for the subject
  - `name` (string): Name of the subject
  - `entries` (array): All class entries for this subject (lectures, seminars, labs)

---

## Notes for Backend Implementation

### Important Considerations:

1. **Teacher Names as IDs**: Teacher names are currently used as identifiers in URLs. Consider URL encoding special characters (spaces, periods, etc.).

2. **Unique Entry IDs**: Each timetable entry must have a globally unique `id` to support operations like adding/removing entries from personalized timetables.

3. **Consistency**: The `teacher` field in entries should match exactly with the teacher names returned by the `/teachers` endpoint.

4. **Time Format**: All times use 24-hour format (0-23 for hours, 0-59 for minutes).

5. **Frequency Values**:
   - `"weekly"` - Every week
   - `"oddweeks"` - Only odd weeks (1, 3, 5, etc.)
   - `"evenweeks"` - Only even weeks (2, 4, 6, etc.)

6. **Optional Fields**: The `format` field can be any string describing the delivery method (e.g., "In-person", "Online", "Hybrid", "Remote").

7. **Group Naming**: Group names should be descriptive (e.g., "Group 221", "221A", "CS Year 2 Group 1").

### Example cURL Requests:

```bash
# Get all teachers
curl -X GET "https://api.example.com/teachers"

# Get all fields
curl -X GET "https://api.example.com/fields"

# Get teacher timetable
curl -X GET "https://api.example.com/teacher/Prof.%20John%20Smith/timetable"

# Get field/year timetables
curl -X GET "https://api.example.com/field/1/year/2/timetables"

# Get all subjects
curl -X GET "https://api.example.com/subjects"
```

### Error Responses:

All endpoints should return appropriate HTTP status codes:
- `200 OK` - Successful request
- `404 Not Found` - Resource not found (teacher, field, etc.)
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "error": "Resource not found",
  "message": "Teacher 'Prof. Unknown' does not exist"
}
```

---
