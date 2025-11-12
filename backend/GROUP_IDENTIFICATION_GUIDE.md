# Understanding Multi-Group Timetable Parsing

## The Problem (Before)

The parser was only extracting **one table** from pages that contain **multiple tables** (one per group).

**Result:** Data loss and missing groups.

---

## The Solution (After)

### Core Concept

**Each `<table>` element on the HTML page = ONE student group.**

That's it. Simple as that.

- Number of `<table>` elements = Number of groups
- Each table contains entries for ONE group only
- Group name is in the **"group" column** of that table

### Example: Matematica Informatica Engleza (MaI1)

The HTML page has **2 tables**:
- **Table 1** → All entries have "831" in the group column → Group 831
- **Table 2** → All entries have "832" in the group column → Group 832

**Groups are:** 831, 832

**NOT groups:** 831/1, 831/2, 832/1, 832/2 (these are subgroups/formations)

---

## How It Works Now

### Step 1: Find All Tables
```typescript
const allTables = findAllTimetableTables($);
// Finds ALL <table> elements with timetable headers
// Returns array of tables
```

### Step 2: Extract Entries from Each Table
For each table:
1. Extract all entries (rows)
2. Collect the values from the "group" column
3. Find the most common value → This is the group name
4. Create a timetable for this group

### Step 3: Return Results
```typescript
[
  {
    groupName: "831",  // From group column
    entries: [...]     // All entries from table 1
  },
  {
    groupName: "832",  // From group column
    entries: [...]     // All entries from table 2
  }
]
```

---

## What We Do NOT Do

❌ **Look at headings** (`<h2>`, `<h3>`, etc.) to find group names
❌ **Parse text patterns** like "Grupa 831" or "Group 221"
❌ **Use filename patterns** like "MIE1", "MIE2"
❌ **Try to infer** from format or structure
❌ **Make assumptions** about naming conventions

---

## What We DO

✅ **Find all `<table>` elements** on the page
✅ **Extract the "group" column** values from each table
✅ **Use the most common value** as the group name
✅ **One table = One group** (always)

---

## Code Example

```typescript
// Parse a timetable URL
const groupTimetables = await parseTimetablesByGroup(url);

// Result for MaI1.html:
// [
//   {
//     academicYear: "2025",
//     semester: "1",
//     specialization: "MaI",
//     yearOfStudy: "1",
//     groupName: "831",  // ← From group column in table 1
//     entries: [
//       { group: "831", subject: "...", ... },
//       { group: "831", subject: "...", ... }
//     ]
//   },
//   {
//     academicYear: "2025",
//     semester: "1",
//     specialization: "MaI",
//     yearOfStudy: "1",
//     groupName: "832",  // ← From group column in table 2
//     entries: [
//       { group: "832", subject: "...", ... },
//       { group: "832", subject: "...", ... }
//     ]
//   }
// ]
```

---

## Testing

Run the test to see it in action:

```bash
cd backend
npx ts-node src/test-multi-group-parsing.ts
```

Expected output:
```
============================================================
Testing Multi-Group Timetable Parsing
============================================================

Key concept: Each <table> element = ONE group
Group names extracted from "group" column values

Test 2: parseTimetablesByGroup() - separate timetables per group
------------------------------------------------------------
✓ Number of tables found: 2
  (Each table on the page = ONE group)

  Table 1:
    Group name: "831" (from "group" column)
    Entries: 50
    Group column values: 831

  Table 2:
    Group name: "832" (from "group" column)
    Entries: 50
    Group column values: 832

Summary:
  - Found 2 tables (= 2 groups)
  - Group names: 831, 832
  - Group names extracted from "group" column, NOT from headings
```

---

## Summary

### Before
- Found 1 table per page
- Returned 1 group
- **Lost data** for other groups

### After
- Finds ALL tables on the page
- Each table = ONE group
- Group name from "group" column
- **No data loss**

### Key Insight
**Stop looking at headings and patterns. Just count the tables and read the group column. That's where the truth is.**

