# Quick Start Guide for Running Tests

## Installation

1. Install the test dependencies:
```bash
cd backend
npm install
```

This will install:
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript definitions for Jest

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (auto-reruns on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

After running with coverage, open `backend/coverage/index.html` in your browser to see a detailed coverage report.

## Test File Location

The test file is located at:
```
backend/src/timetable-parser.test.ts
```

## What Gets Tested

The test suite validates that the HTML parser correctly extracts:
- ✅ Days of the week
- ✅ Course names
- ✅ Hours/time intervals
- ✅ Professors/teachers
- ✅ Room numbers
- ✅ Type/format (Curs, Laborator, Seminar)
- ✅ Frequency information
- ✅ Group/formation information

It also tests edge cases like:
- Missing fields
- Malformed HTML
- Empty timetables
- Various header variations
- Special characters

## Expected Output

When all tests pass, you should see output like:
```
 PASS  src/timetable-parser.test.ts
  Timetable Parser Tests
    Normal Cases - Complete Timetable
      ✓ should correctly parse days of the week
      ✓ should correctly parse course names
      ✓ should correctly parse hours/time intervals
      ✓ should correctly parse professors/teachers
      ✓ should correctly parse room numbers
      ✓ should correctly parse type/format
      ...
    Edge Cases - Missing Fields
      ✓ should handle missing teacher field
      ✓ should handle missing room field
      ...

Test Suites: 1 passed, 1 total
Tests:       XX passed, XX total
```

## Troubleshooting

If tests fail to run:
1. Make sure you're in the `backend` directory
2. Run `npm install` to ensure all dependencies are installed
3. Check that TypeScript is properly configured (`tsconfig.json` exists)
4. Verify that Jest configuration is correct (`jest.config.js` exists)

If specific tests fail:
1. Read the error message carefully
2. Check if the parser implementation has changed
3. Verify that the expected behavior is correct
4. Update test cases if requirements have changed

