# Timetable Parser Test Suite

## Overview

This test suite provides comprehensive testing for the UBB timetable HTML parser. It validates that the parser correctly extracts timetable information from university web pages that contain **multiple group timetables** identified by H1 headings.

## Key Concepts Tested

### Multi-Group Architecture
The parser handles pages where:
- Each `<h1>` heading with a 3-digit number (e.g., "Grupa 211") indicates a group
- Each group has its own timetable `<table>` following the H1
- The "Formatia" column contains subgroup info (e.g., "211/1", "211/2") which is preserved

### Two Parsing Methods
1. **`parseTimetable(url)`** - Combines all groups from a page into one timetable
2. **`parseTimetablesByGroup(url)`** - Returns separate timetable for each group

---

## Test Coverage

### 1. URL Metadata Extraction
Tests that verify correct extraction of metadata from URL patterns:
- ✅ Academic year (e.g., "2024" from "2024-1")
- ✅ Semester (e.g., "1" from "2024-1")
- ✅ Specialization (e.g., "INFO" from "INFO3.html")
- ✅ Year of study (e.g., "3" from "INFO3.html")
- ✅ Error handling for invalid URL formats

**Test Cases:**
- Standard URL pattern: `/orar/2024-1/tabelar/INFO3.html`
- Different years and semesters
- Invalid URL format throws error

---

### 2. Single Group Parsing (`parseTimetable`)
Tests that verify correct parsing when combining all groups:

#### Complete Timetable Parsing
- ✅ Days of the week (Luni, Marti, etc.)
- ✅ Time intervals (e.g., "08:00-10:00")
- ✅ Frequency (e.g., "sapt. 1-14")
- ✅ Room numbers
- ✅ Formatia/subgroup values (preserved as-is)
- ✅ Class types (Curs, Laborator, Seminar)
- ✅ Subject names
- ✅ Teacher names

#### Missing Fields Handling
- ✅ Missing teacher → defaults to empty string
- ✅ Missing room → defaults to empty string
- ✅ Missing frequency → defaults to empty string
- ✅ Missing optional fields handled gracefully

#### Data Normalization
- ✅ Whitespace normalization in teacher names
- ✅ Empty rows are skipped
- ✅ Non-breaking spaces removed

---

### 3. Multiple Groups Parsing (`parseTimetablesByGroup`)
Tests that verify correct identification and separation of groups:

#### Group Identification
- ✅ Detects groups from H1 headings with 3-digit numbers
- ✅ Extracts full H1 text as group name (e.g., "Grupa 211")
- ✅ Skips H1 elements without 3-digit numbers
- ✅ Handles multiple groups on same page (211, 212, 213)

**Example:**
```html
<h1>Grupa 211</h1>
<table>...</table>
<h1>Grupa 212</h1>
<table>...</table>
```
Result: 2 separate timetables

#### Per-Group Entry Extraction
- ✅ Correct entries assigned to each group
- ✅ Subgroup information preserved in Formatia column
- ✅ Each group has its own entry list

**Example:**
- Group "Grupa 831" has entries with Formatia: "831/1", "831/2"
- Group "Grupa 832" has entries with Formatia: "832/1"

#### Edge Cases
- ✅ Groups without following table are skipped
- ✅ H1 without 3-digit number is ignored
- ✅ Throws error when no valid groups found

---

### 4. Subgroup Preservation
Tests that verify Formatia column values are kept as-is:

- ✅ "211/1", "211/2" preserved exactly
- ✅ "I1", "I2" preserved exactly
- ✅ Other formats preserved exactly
- ✅ Formatia is NOT used as the group identifier (H1 is)

**Important:** 
- Group name comes from H1 (e.g., "Grupa 211")
- Formatia column contains subgroups (e.g., "211/1", "211/2")

---

### 5. Combined vs Separated Parsing
Tests comparing both parsing methods:

- ✅ Total entries match between methods
- ✅ `parseTimetable()` combines all groups
- ✅ `parseTimetablesByGroup()` separates by group
- ✅ Sum of separated entries = combined entries

---

### 6. Multiple Timetables (`parseMultipleTimetables`)
Tests for batch parsing multiple URLs:

- ✅ Successfully parses multiple URLs
- ✅ Handles partial failures gracefully
- ✅ Returns only successful parses
- ✅ Continues parsing even if one URL fails

**Example:**
```typescript
const urls = [
  'https://example.com/.../CS1.html',
  'https://example.com/.../CS2.html',  // fails
  'https://example.com/.../CS3.html'
];
// Returns timetables for CS1 and CS3
```

---

### 7. Utility Functions
Tests for helper functions:

#### `exportToJson(timetable, pretty)`
- ✅ Formats timetable as JSON string
- ✅ Respects pretty parameter
- ✅ Produces valid parseable JSON
- ✅ Pretty version has newlines, compact doesn't

#### `createTimetableHash(timetable)`
- ✅ Generates SHA-256 hash
- ✅ Consistent hashes for same timetable
- ✅ Different hashes for different timetables
- ✅ Returns 64-character hex string

---

### 8. Error Handling
Tests for various error scenarios:

- ✅ Empty page (< 1000 bytes) → throws specific error
- ✅ Page with no timetable tables → throws error
- ✅ Network errors propagate correctly
- ✅ Invalid URL format → throws descriptive error

**Error Messages:**
- "Empty timetable page (X bytes) - program may not have started yet"
- "Could not locate any timetable tables on the page"
- "Could not locate any group timetables on the page"
- "URL does not match expected pattern"

---

## Running the Tests

```bash
# Run all tests
npm test

# Run only timetable parser tests
npm test timetable-parser.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

---

## Test Structure

### Helper Functions
The test file includes helper functions for generating test HTML:

```typescript
createSingleGroupHtml(groupNumber: string)
// Creates HTML with one group

createMultipleGroupsHtml(groupNumbers: string[])
// Creates HTML with multiple groups
```

### Test Organization
Tests are organized into logical describe blocks:
1. URL Metadata Extraction
2. Single Group Parsing
3. Multiple Groups Parsing  
4. Subgroup Preservation
5. Combined vs Separated
6. Multiple Timetables
7. Utility Functions
8. Error Handling

---

## Coverage Goals

- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: 100%
- **Lines**: > 95%

---

## Example Test Cases

### Testing Multiple Groups
```typescript
test('should parse multiple groups from H1 headings', async () => {
  const html = `
    <h1>Grupa 211</h1>
    <table>...</table>
    <h1>Grupa 212</h1>
    <table>...</table>
  `;
  
  const result = await parseTimetablesByGroup(url);
  
  expect(result).toHaveLength(2);
  expect(result[0].groupName).toBe('Grupa 211');
  expect(result[1].groupName).toBe('Grupa 212');
});
```

### Testing Subgroup Preservation
```typescript
test('should preserve subgroup information', async () => {
  const html = `
    <h1>Grupa 221</h1>
    <table>
      <tr><th>Formatia</th></tr>
      <tr><td>221/1</td></tr>
      <tr><td>221/2</td></tr>
    </table>
  `;
  
  const result = await parseTimetablesByGroup(url);
  
  expect(result[0].entries[0].group).toBe('221/1');
  expect(result[0].entries[1].group).toBe('221/2');
});
```

---

## Notes for Developers

1. **Mock Data**: All tests use mocked axios to avoid real HTTP requests
2. **Test Isolation**: Each test is independent and cleans up after itself
3. **Realistic HTML**: Test HTML closely mirrors actual UBB timetable pages
4. **Edge Cases**: Pay special attention to H1 detection and Formatia preservation

---

## Continuous Integration

These tests run automatically on:
- Every commit
- Every pull request
- Before deployment

Failing tests block merges to main branch.

### 6. **URL Validation**
Tests for URL parsing and metadata extraction:
- Invalid URL format → throws error
- Valid URLs with different specializations → correctly parsed

### 7. **Multiple Timetables**
Tests for batch processing:
- Parsing multiple timetables successfully
- Handling partial failures (some succeed, some fail)

### 8. **Utility Functions**
Tests for helper functions:
- `exportToJson()` → pretty and compact formatting
- `createTimetableHash()` → consistent hashing, different hashes for different data

### 9. **Special Characters and Edge Cases**
Tests for unusual but valid data:
- Special characters in course names (e.g., "C++ & Algoritmi")
- Numbers in room names (e.g., "Lab 3.14")
- Various time formats (e.g., "8:00 - 10:00", "14:00-16:00", "16.00-18.00")

## Running the Tests

### Prerequisites
Install the required dependencies:
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
Automatically re-runs tests when files change:
```bash
npm run test:watch
```

### Run Tests with Coverage Report
Generates a detailed coverage report:
```bash
npm run test:coverage
```

The coverage report will be available in the `coverage/` directory. Open `coverage/index.html` in a browser for a visual report.

## Test Structure

### Sample HTML Snippets
Each test uses mock HTML snippets that mimic the structure of real UBB timetable pages. For example:

```html
<table>
  <tr>
    <th>Ziua</th>
    <th>Ore</th>
    <th>Frecventa</th>
    <th>Sala</th>
    <th>Formatia</th>
    <th>Tip</th>
    <th>Disciplina</th>
    <th>Titular</th>
  </tr>
  <tr>
    <td>Luni</td>
    <td>08:00-10:00</td>
    <td>sapt. 1-14</td>
    <td>309</td>
    <td>INFO3</td>
    <td>Curs</td>
    <td>Algoritmi Paraleli</td>
    <td>Prof. Dr. Popescu Ion</td>
  </tr>
</table>
```

### Assertions
Each test includes clear assertions using Jest matchers:
- `expect(result.entries).toHaveLength(3)` - verifies count
- `expect(result.entries[0].day).toBe('Luni')` - verifies exact value
- `expect(parseTimetable(url)).rejects.toThrow('error message')` - verifies errors

### Test Names
Tests use descriptive names that clearly indicate what is being tested:
- `should correctly parse days of the week`
- `should handle missing teacher field`
- `should throw error for invalid URL format`

## Mock Setup

The test suite uses Jest to mock the `axios` HTTP client, allowing tests to run without making actual network requests. Each test provides its own HTML response data.

## Expected Results

All tests should pass when the parser is working correctly. If tests fail:
1. Check the error message to understand what failed
2. Verify the parser implementation matches expected behavior
3. Check if the HTML structure has changed
4. Update test cases if requirements have changed

## Adding New Tests

To add new test cases:
1. Add a new `test()` or `describe()` block
2. Create appropriate mock HTML data
3. Mock the axios response with `mockedAxios.get.mockResolvedValue({ data: html })`
4. Call the parser function
5. Add assertions to verify expected behavior

Example:
```typescript
test('should handle new edge case', async () => {
  const html = `<table>...</table>`;
  mockedAxios.get.mockResolvedValue({ data: html });
  
  const result = await parseTimetable(validUrl);
  
  expect(result.entries[0].someField).toBe('expectedValue');
});
```

## Continuous Integration

These tests are designed to be run in CI/CD pipelines. The exit code will be non-zero if any test fails, causing the build to fail.

## Notes

- Whitespace is automatically trimmed from all fields
- The parser is designed to be fault-tolerant, continuing even when some fields are missing
- URL format must match: `/files/orar/{YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR}.html`

