# Timetable Parser - Test Documentation

## Overview

Comprehensive test suite for the UBB timetable parser that handles multi-group timetable pages using H1 headings to identify groups.

## Test Structure

### 1. URL Metadata Extraction Tests
Tests URL parsing functionality to extract academic year, semester, specialization, and year of study.

```typescript
'https://example.com/files/orar/2024-1/tabelar/INFO3.html'
// Extracts: academicYear=2024, semester=1, specialization=INFO, yearOfStudy=3
```

**Test Cases:**
- ✅ Extract metadata from standard URL pattern
- ✅ Throw error for invalid URL format

---

### 2. Single Group Parsing Tests (`parseTimetable()`)
Tests parsing of timetable pages into a single combined timetable.

**Test Cases:**
- ✅ **Parse complete timetable** - All fields (day, hours, frequency, room, group, type, subject, teacher)
- ✅ **Handle missing optional fields** - Defaults to empty strings when fields are missing
- ✅ **Skip empty rows** - Rows with no data are ignored

**Example:**
```typescript
const result = await parseTimetable(url);
// Returns single timetable with all groups combined
expect(result.entries[0].subject).toBe('Algoritmi Paraleli');
```

---

### 3. Multiple Groups Parsing Tests (`parseTimetablesByGroup()`)
Tests parsing of timetable pages into separate timetables for each group based on H1 headings.

**Key Concept:**  
- Each `<h1>` with a number of 2+ digits (e.g., "Grupa 211", "Grupa 1234") identifies a group
- Each group has its own timetable table following the H1
- Formatia column (e.g., "211/1", "211/2") contains subgroup info

**Test Cases:**
- ✅ **Parse multiple groups from H1 headings** - Identifies "Grupa 211", "Grupa 212", etc.
- ✅ **Extract correct entries for each group** - Each group has its own entry list
- ✅ **Handle groups with various digit counts** - Supports 2-digit (11), 3-digit (311), and 4+ digit (1234) groups
- ✅ **Throw error when no groups found** - Error if no valid groups on page

**Example:**
```typescript
const result = await parseTimetablesByGroup(url);
// Returns array of timetables, one per group
expect(result[0].groupName).toBe('Grupa 211');
expect(result[1].groupName).toBe('Grupa 1234'); // 4-digit groups also work!
```

---

### 4. Multiple Timetables Parsing Tests (`parseMultipleTimetables()`)
Tests batch parsing of multiple timetable URLs.

**Test Cases:**
- ✅ **Parse multiple URLs successfully** - Returns array of timetables
- ✅ **Handle partial failures gracefully** - Continues even if some URLs fail

**Example:**
```typescript
const urls = [
  'https://example.com/.../CS1.html',
  'https://example.com/.../CS2.html'
];
const results = await parseMultipleTimetables(urls);
// Returns only successful parses
```

---

### 5. Utility Functions Tests

#### `exportToJson(timetable, pretty)`
- ✅ Format timetable correctly
- ✅ Respect pretty parameter (pretty vs compact JSON)

#### `createTimetableHash(timetable)`
- ✅ Generate consistent SHA-256 hashes for same timetable
- ✅ Different hashes for different timetables

---

### 6. Error Handling Tests

**Test Cases:**
- ✅ **Throw error for empty page** - Pages < 1000 bytes
- ✅ **Throw error for page with no timetable tables** - No valid tables found
- ✅ **Handle network errors** - Propagate axios errors

**Error Messages:**
- `"Empty timetable page (X bytes) - program may not have started yet"`
- `"Could not locate any timetable tables on the page"`
- `"Could not locate any group timetables on the page"`
- `"URL does not match expected pattern"`

---

## Running Tests

```bash
# Run all tests
npm test

# Run only timetable parser tests
npm test timetable-parser.test.ts

# Run with verbose output
npm test -- timetable-parser.test.ts --verbose

# Run with coverage
npm run test:coverage
```

---

## Helper Functions

The test suite includes helper functions to generate mock HTML:

### `createSingleGroupHtml(groupNumber: string)`
Creates HTML with one group and minimal fields.

### `createCompleteHtml()`
Creates HTML with all fields (day, hours, frequency, room, group, type, subject, teacher).

### `createMinimalHtml()`
Creates HTML with only required fields.

### `createHtmlWithEmptyRows()`
Creates HTML with empty rows to test row skipping.

### `createMultipleGroupsHtml(groupNumbers: string[])`
Creates HTML with multiple groups (e.g., ['211', '212', '213']).

### `createHtmlWithTwoGroups()`
Creates HTML with two groups and different subjects.

### `createHtmlWithInvalidH1()`
Creates HTML with invalid H1 elements (no 3-digit group numbers).

### `createHtmlWithNoGroups()`
Creates HTML with no valid groups.

---

## Test Coverage Goals

- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: 100%
- **Lines**: > 95%

---

## Key Parser Behaviors Tested

### 1. Group Identification
✅ Groups are identified by `<h1>` elements containing numbers with 2+ digits  
✅ Supports 2-digit (e.g., "Grupa 11"), 3-digit (e.g., "Grupa 211"), and 4+ digit groups (e.g., "Grupa 1234")  
✅ Group name is the full H1 text (e.g., "Grupa 211")  
✅ Each group has its own table following the H1

### 2. Subgroup Handling
✅ Formatia column values (e.g., "211/1", "211/2") are preserved  
✅ Formatia is NOT used as the group identifier  
✅ Subgroups are part of the entry data, not group metadata

### 3. Data Normalization
✅ Whitespace is trimmed  
✅ Non-breaking spaces are removed  
✅ Teacher names with commas are normalized  
✅ Empty rows are skipped

### 4. Error Resilience
✅ Missing fields default to empty strings  
✅ Invalid HTML is handled gracefully  
✅ Network errors are propagated with clear messages

---

## Example Test Execution

```bash
$ npm test timetable-parser.test.ts

PASS  src/timetable-parser.test.ts
  Timetable Parser Tests
    URL Metadata Extraction
      ✓ should extract metadata from standard URL pattern (5ms)
      ✓ should throw error for invalid URL format (2ms)
    parseTimetable() - Single Group
      ✓ should parse complete timetable with all fields (3ms)
      ✓ should handle missing optional fields (2ms)
      ✓ should skip empty rows (2ms)
    parseTimetablesByGroup() - Multiple Groups
      ✓ should parse multiple groups from H1 headings (4ms)
      ✓ should extract correct entries for each group (3ms)
      ✓ should skip H1 elements without 3-digit numbers (3ms)
      ✓ should throw error when no groups found (2ms)
    parseMultipleTimetables()
      ✓ should parse multiple URLs successfully (4ms)
      ✓ should handle partial failures gracefully (3ms)
    Utility Functions
      ✓ exportToJson should format timetable correctly (2ms)
      ✓ exportToJson should respect pretty parameter (2ms)
      ✓ createTimetableHash should generate consistent hashes (2ms)
      ✓ createTimetableHash should differ for different timetables (3ms)
    Error Handling
      ✓ should throw error for empty page (2ms)
      ✓ should throw error for page with no timetable tables (2ms)
      ✓ should handle network errors (2ms)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        2.5s
```

---

## Continuous Integration

Tests run automatically on:
- Every commit
- Every pull request  
- Before deployment

Failing tests block merges to main branch.

---

## Contributing

When adding new parser features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add new test cases for edge cases
4. Update this documentation

---

## Related Documentation

- **[TEST_README.md](./TEST_README.md)** - General testing guide
- **[MULTI_GROUP_PARSING.md](./MULTI_GROUP_PARSING.md)** - Multi-group parsing details
- **[GROUP_IDENTIFICATION_GUIDE.md](./GROUP_IDENTIFICATION_GUIDE.md)** - Group identification logic

---

*Last Updated: 2025-01-12*

