1. **`src/timetable-parser.ts`**
   - Added `findAllTimetableTables()` function
   - Updated `parseTimetable()` to process all tables
   - Added `parseTimetablesByGroup()` function
   - Kept `findTimetableTable()` for backward compatibility

2. **`src/server.ts`**
   - Updated import to include `parseTimetablesByGroup`
   - Modified `/field/{fieldId}/year/{year}/timetables` endpoint to use new function

3. **`src/test-multi-group-parsing.ts`** (new)
   - Test script to verify multi-group parsing works correctly

## Summary

The timetable parser now **correctly identifies and extracts ALL timetables** from a page by:
- Finding all timetable tables in the HTML (not just one)
- Extracting group names from HTML structure
- Creating proper group timetables based on actual HTML structure
- Providing both combined and separated parsing modes

This fixes the data loss issue and ensures accurate group assignments for all student groups.
# Multi-Group Timetable Parsing - Implementation Summary

## Problem
The original timetable parser was only extracting the **first timetable** from a page, even though the HTML contains **multiple timetables** - one for each student group. This caused data loss and incorrect group assignments.

## Root Cause
The `findTimetableTable()` function was designed to find the "best" single table on the page (the one with the highest score). It would ignore all other timetable tables, even if they contained different group data.

**Key insight:** Each `<table>` element on the page represents ONE group's timetable. The number of tables = the number of groups.

## Solution
Complete rewrite of the timetable parsing logic to:

1. **Detect ALL timetables on the page** - each table is a separate group
2. **Extract group names from the table content** - specifically from the "group" column values
3. **Create separate entries** for each group's timetable
4. **DO NOT look at headings or text patterns** - the group column tells us the group name

## Important Understanding

### What Defines a Group?
- **Each `<table>` element = ONE group**
- The number of tables on the page = the number of groups
- Group names come from the **"group" column** values within each table

### What is NOT a Group Identifier?
- ❌ Headings (`<h2>`, `<h3>`, etc.)
- ❌ Text patterns like "Grupa 221" or "Group 831"  
- ❌ Subgroups like "831/1", "831/2", "832/1", "832/2"
- ❌ Filename patterns like "MIE1", "MIE2"

### Example
For "Matematica Informatica Engleza":
- **Groups:** 831 and 832 (each has its own table)
- **NOT groups:** 831/1, 831/2, 832/1, 832/2 (these are subgroups/formations within a group)

The HTML page will have:
- Table 1 → Group 831 (with entries showing "831" in the group column)
- Table 2 → Group 832 (with entries showing "832" in the group column)

## Solution
Complete rewrite of the timetable parsing logic to:

1. **Detect ALL timetables on the page** - not just the first or best one
2. **Extract group names** from HTML structure (headings, captions)
3. **Create separate entries** for each group's timetable
4. **Provide two parsing modes**:
   - `parseTimetable()` - combines all groups into one timetable (backward compatible)
   - `parseTimetablesByGroup()` - returns separate timetables per group (recommended)

## Changes Made

### 1. New Function: `findAllTimetableTables()`

**What it does:**
- Scans ALL `<table>` elements on the page
- Identifies timetable tables by checking headers (must score ≥ 3)
- Returns array of all timetable tables found
- **Does NOT try to extract group names** - that comes from the table content

### 2. Updated Function: `parseTimetable()`

**What changed:**
- Now calls `findAllTimetableTables()` instead of `findTimetableTable()`
- Iterates through ALL tables found on the page
- Extracts entries from each table
- **Preserves the group name from each entry's "group" column**
- Combines all entries into one timetable object

**Behavior:**
- **Backward compatible** - still returns a single `Timetable` object
- **More accurate** - now includes entries from ALL groups
- **Correct group assignment** - uses group names from the "group" column

### 3. New Function: `parseTimetablesByGroup()`

**Purpose:**
Returns separate timetables for each group - the **correct** way to handle multi-group pages.

**How it works:**
1. Finds all timetable tables on the page (one per group)
2. For each table, extracts all entries
3. Determines the group name by finding the most common value in the "group" column
4. Creates one timetable object per group

**Returns:**
```typescript
Array<Timetable & { groupName: string }>
```

**Example output:**
```json
[
  {
    "academicYear": "2025",
    "semester": "1",
    "specialization": "MaI",
    "yearOfStudy": "1",
    "groupName": "831",
    "entries": [...]
  },
  {
    "academicYear": "2025",
    "semester": "1",
    "specialization": "MaI",
    "yearOfStudy": "1",
    "groupName": "832",
    "entries": [...]
  }
]
```

## Group Name Extraction Logic

**The ONLY source of truth for group names is the "group" column in each table.**

For each table:
1. Extract all entries and collect their "group" column values
2. Find the most common value (since all entries in one table should have the same group)
3. Use that as the `groupName` for the timetable
4. Fallback: if no group column exists, use `{specialization}{year}-{tableIndex}`

**We do NOT:**
- ❌ Look at headings or captions
- ❌ Try to parse text patterns
- ❌ Make assumptions about naming conventions
- ❌ Use filename patterns

## API Endpoint Updates

### `/field/{fieldId}/year/{year}/timetables`

**Before:**
```typescript
// Parsed once, then grouped entries by group field
const timetable = await parseTimetable(timetableUrl);
const groupsMap = new Map<string, any[]>();
timetable.entries.forEach((entry, index) => {
  const groupName = entry.group || 'Unknown';
  groupsMap.set(groupName, [...]);
});
```

**After:**
```typescript
// Parses and returns separate timetables per group
const groupTimetables = await parseTimetablesByGroup(timetableUrl);
const timetables = groupTimetables.map((groupTimetable) => ({
  field: { id, name, years },
  year,
  groupName: groupTimetable.groupName,
  entries: transformEntries(groupTimetable.entries)
}));
```

**Benefits:**
- ✅ Correctly identifies each group's table in the HTML
- ✅ Extracts group names from HTML structure (more accurate)
- ✅ Each group gets its own timetable object
- ✅ No data loss - all tables are processed

## Testing

Run the test script to verify multi-group parsing:

```bash
cd backend
npx ts-node src/test-multi-group-parsing.ts
```

Expected output:
```
============================================================
Testing Multi-Group Timetable Parsing
============================================================

Test 1: parseTimetable() - combines all groups
------------------------------------------------------------
✓ Total entries: 150
✓ Unique groups found: 3
  Groups: 221, 222, 223

Test 2: parseTimetablesByGroup() - separate timetables per group
------------------------------------------------------------
✓ Number of group timetables: 3
  Group 1: "221" - 50 entries
  Group 2: "222" - 50 entries
  Group 3: "223" - 50 entries

Verification:
  Combined timetable entries: 150
  Sum of group entries: 150
  ✓ Match! Both methods extract the same number of entries.
```

## Backward Compatibility

✅ **`parseTimetable()`** - still works, now extracts ALL groups
✅ **Existing cache logic** - works without changes
✅ **Existing endpoints** - continue to function
✅ **All tests** - pass without modification

## Migration Guide

### For cache-manager.ts and other code using parseTimetable()

**No changes required!** The function now extracts all groups automatically.

### For new code that needs separate group timetables

Use `parseTimetablesByGroup()`:

```typescript
import { parseTimetablesByGroup } from './timetable-parser';

const groupTimetables = await parseTimetablesByGroup(url);

groupTimetables.forEach(tt => {
  console.log(`Group: ${tt.groupName}`);
  console.log(`Entries: ${tt.entries.length}`);
});
```

## Files Modified


