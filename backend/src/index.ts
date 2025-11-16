/**
 * UBB Timetable Parser
 * 
 * A TypeScript library for fetching and parsing UBB Cluj timetable HTML pages.
 */

export {
  parseTimetable,
  parseMultipleTimetables,
  exportToJson,
  createTimetableHash
} from './parsers/timetable-parser';

export {
  Timetable,
  TimetableEntry,
  UrlMetadata
} from './types';
