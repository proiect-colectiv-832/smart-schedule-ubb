/**
 * Timetable to Events Converter
 * Converts scraped timetable entries to user events format
 */

import { TimetableEntry } from '../types';
import { UserEvent, RecurrenceRule } from './user-timetable-manager';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convert timetable entries to user events
 * @param entries - Array of timetable entries from scraper
 * @param semesterStart - Start date of the semester
 * @param semesterEnd - End date of the semester (optional)
 * @returns Array of user events
 */
export function convertTimetableEntriesToEvents(
  entries: TimetableEntry[],
  semesterStart: Date,
  semesterEnd?: Date
): UserEvent[] {
  const events: UserEvent[] = [];

  for (const entry of entries) {
    const event = convertSingleEntry(entry, semesterStart, semesterEnd);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Convert a single timetable entry to a user event
 */
function convertSingleEntry(
  entry: TimetableEntry,
  semesterStart: Date,
  semesterEnd?: Date
): UserEvent | null {
  try {
    // Parse day of week
    const dayOfWeek = parseDayOfWeek(entry.day);
    if (dayOfWeek === -1) {
      console.warn(`Invalid day: ${entry.day}`);
      return null;
    }

    // Parse time
    const { startHour, startMinute, endHour, endMinute } = parseTime(entry.hours);

    // Calculate first occurrence date
    const firstOccurrence = getNextDayOfWeek(semesterStart, dayOfWeek);

    // Set start time
    const startTime = new Date(firstOccurrence);
    startTime.setHours(startHour, startMinute, 0, 0);

    // Set end time
    const endTime = new Date(firstOccurrence);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Parse recurrence rule
    const recurrenceRule = parseRecurrenceRule(entry.frequency, dayOfWeek, semesterEnd);

    // Determine event type
    const type = parseEventType(entry.type);

    // Build event
    const event: UserEvent = {
      id: uuidv4(),
      title: `${entry.subject} (${entry.type})`,
      startTime,
      endTime,
      location: entry.room || undefined,
      description: `Teacher: ${entry.teacher}\nGroup: ${entry.group}\nType: ${entry.type}`,
      isRecurring: true,
      recurrenceRule,
      type,
    };

    return event;
  } catch (error) {
    console.error('Error converting entry:', entry, error);
    return null;
  }
}

/**
 * Parse day of week from Romanian day name
 */
function parseDayOfWeek(day: string): number {
  const dayMap: Record<string, number> = {
    'duminica': 0,
    'duminică': 0,
    'sunday': 0,
    'luni': 1,
    'monday': 1,
    'marti': 2,
    'marți': 2,
    'tuesday': 2,
    'miercuri': 3,
    'wednesday': 3,
    'joi': 4,
    'thursday': 4,
    'vineri': 5,
    'friday': 5,
    'sambata': 6,
    'sâmbătă': 6,
    'saturday': 6,
  };

  return dayMap[day.toLowerCase()] ?? -1;
}

/**
 * Parse time from hours string (e.g., "8-10" or "8:00-10:00")
 */
function parseTime(hours: string): {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
} {
  const parts = hours.split('-');

  const parseTimePart = (part: string) => {
    const match = part.trim().match(/(\d+):?(\d*)/);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: match[2] ? parseInt(match[2]) : 0,
      };
    }
    return { hour: 8, minute: 0 };
  };

  const start = parseTimePart(parts[0] || '8');
  const end = parseTimePart(parts[1] || '10');

  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  };
}

/**
 * Parse recurrence rule from frequency string
 */
function parseRecurrenceRule(
  frequency: string,
  dayOfWeek: number,
  semesterEnd?: Date
): RecurrenceRule {
  const freqLower = frequency.toLowerCase().trim();

  let freq: 'weekly' | 'biweekly' | 'oddweeks' | 'evenweeks' = 'weekly';

  if (freqLower.includes('sapt. 1') || freqLower.includes('săpt. 1') || freqLower === 's1') {
    freq = 'oddweeks';
  } else if (freqLower.includes('sapt. 2') || freqLower.includes('săpt. 2') || freqLower === 's2') {
    freq = 'evenweeks';
  } else if (freqLower.includes('biweekly') || freqLower.includes('bi-weekly')) {
    freq = 'biweekly';
  }

  return {
    frequency: freq,
    daysOfWeek: [dayOfWeek],
    until: semesterEnd,
  };
}

/**
 * Parse event type from type string
 */
function parseEventType(type: string): 'lecture' | 'lab' | 'seminar' | 'custom' {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('curs') || typeLower === 'c' || typeLower === 'lecture') {
    return 'lecture';
  } else if (typeLower.includes('lab') || typeLower === 'l') {
    return 'lab';
  } else if (typeLower.includes('seminar') || typeLower === 's') {
    return 'seminar';
  }

  return 'lecture'; // Default
}

/**
 * Get the next occurrence of a specific day of week from a given date
 */
function getNextDayOfWeek(fromDate: Date, dayOfWeek: number): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();

  let daysToAdd = dayOfWeek - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Get the Monday of the week containing a given date
 * This is important because UBB semesters start on the Monday of the week
 * containing October 1st (fall) or February 1st (spring)
 */
function getMondayOfWeek(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We need to go back to Monday (if Sunday, go back 6 days; if Monday, stay; if Tuesday, go back 1 day, etc.)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  result.setDate(result.getDate() - daysToSubtract);
  return result;
}

/**
 * Get default semester dates based on current date
 * UBB semesters start on the Monday of the week containing:
 * - October 1st for fall semester
 * - February 1st for spring semester
 * 
 * Note: The end date is set to a conservative estimate (mid-January / end of May)
 * to avoid generating events during exam periods. For accurate dates,
 * the academic calendar structure should be consulted.
 */
export function getDefaultSemesterDates(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let start: Date;
  let end: Date;

  // Fall semester (October - January)
  if (month >= 9 || month <= 0) {
    // Get October 1st of the appropriate year
    const oct1 = new Date(month >= 9 ? year : year - 1, 9, 1);
    // Get the Monday of the week containing October 1st
    start = getMondayOfWeek(oct1);
    // End date: January 18 (typical last day of teaching before exams)
    // The exact date should come from academic calendar structure
    end = new Date(month >= 9 ? year + 1 : year, 0, 18);
  }
  // Spring semester (February - June)
  else {
    // Get February 1st
    const feb1 = new Date(year, 1, 1);
    // Get the Monday of the week containing February 1st
    start = getMondayOfWeek(feb1);
    // End date: May 31 (typical last day of teaching before June exams)
    // The exact date should come from academic calendar structure
    end = new Date(year, 4, 31);
  }

  return { start, end };
}
