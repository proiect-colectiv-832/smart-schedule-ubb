/**
 * TypeScript interfaces for UBB Timetable Parser
 */

export interface TimetableEntry {
  day: string;
  hours: string;
  frequency: string;
  room: string;
  group: string;
  type: string;
  subject: string;
  teacher: string;
}

export interface Timetable {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
  entries: TimetableEntry[];
}

export interface UrlMetadata {
  academicYear: string;
  semester: string;
  specialization: string;
  yearOfStudy: string;
}

export interface Professor {
  name: string;
  timetableEntries: TimetableEntry[];
}