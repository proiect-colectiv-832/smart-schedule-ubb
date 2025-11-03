# Timetable Parser Test Suite

## Overview

This test suite provides comprehensive testing for the UBB timetable HTML parser. It validates that the parser correctly extracts all required information from university timetable web pages.

## Test Coverage

The test suite covers the following aspects:

### 1. **Normal Cases - Complete Timetable**
Tests that verify the parser correctly extracts all fields from a properly formatted timetable:
- ✅ Days of the week (Luni, Marți, Miercuri, etc.)
- ✅ Course/subject names
- ✅ Hours/time intervals (e.g., "08:00-10:00")
- ✅ Professors/teachers
- ✅ Room numbers
- ✅ Type/format (Curs, Laborator, Seminar)
- ✅ Frequency information
- ✅ Group/formation information
- ✅ URL metadata extraction (academic year, semester, specialization, year of study)

### 2. **Edge Cases - Missing Fields**
Tests that verify the parser handles missing data gracefully:
- Missing teacher field → defaults to empty string
- Missing room field → defaults to empty string
- Missing type/format field → defaults to empty string
- Missing frequency field → defaults to empty string
- Missing group field → uses default from URL (specialization + year)

### 3. **Edge Cases - Malformed HTML**
Tests that verify the parser can handle various HTML issues:
- Extra whitespace in cells → properly trimmed
- Non-breaking spaces (`&nbsp;`) → converted to regular spaces
- Multiple comma-separated teachers → normalized with proper spacing
- Empty rows → skipped
- Rows with no `<td>` elements → skipped

### 4. **Edge Cases - Empty Timetable**
Tests for scenarios with minimal or no data:
- Table with only headers → returns empty entries array
- No table found → throws appropriate error
- Table with too few columns → throws error

### 5. **Edge Cases - Different Header Variations**
Tests that verify the parser recognizes various Romanian header names:
- "Zi", "Ziua" → recognized as day
- "Ora", "Ore", "Interval orar" → recognized as hours
- "Materie", "Disciplina", "Curs" → recognized as subject
- "Sala", "Locație", "Sala/Lab" → recognized as room

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

