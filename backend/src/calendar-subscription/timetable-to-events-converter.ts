/**
 * Timetable to Events Converter
 * Converts scraped timetable entries to user events format
 */

import { TimetableEntry } from '../types';
import { UserEvent, RecurrenceRule } from './user-timetable-manager';
import { v4 as uuidv4 } from 'uuid';
import { formatRoomInfoForDescription, formatRoomLocationForCalendar } from './room-location-service';
import { normalizeTimetableFrequency } from './timetable-frequency';

/**
 * Convert timetable entries to user events
 * @param entries - Array of timetable entries from scraper
 * @param semesterStart - Start date of the semester
 * @param semesterEnd - End date of the semester (optional)
 * @returns Array of user events
 */
export async function convertTimetableEntriesToEvents(
  entries: TimetableEntry[],
  semesterStart: Date,
  semesterEnd?: Date
): Promise<UserEvent[]> {
  const events: UserEvent[] = [];

  for (const entry of entries) {
    const event = await convertSingleEntry(entry, semesterStart, semesterEnd);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Convert a single timetable entry to a user event
 */
async function convertSingleEntry(
  entry: TimetableEntry,
  semesterStart: Date,
  semesterEnd?: Date
): Promise<UserEvent | null> {
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

    // Get room location information
    let roomInfo = '';
    let locationAddress = '';
    if (entry.room) {
      roomInfo = await formatRoomInfoForDescription(entry.room);
      locationAddress = await formatRoomLocationForCalendar(entry.room);
    }

    // Build event
    const event: UserEvent = {
      id: uuidv4(),
      title: `${entry.subject} (${entry.type})`,
      startTime,
      endTime,
      location: locationAddress || undefined,
      description: `Teacher: ${entry.teacher}\nGroup: ${entry.group}\nType: ${entry.type}${roomInfo ? `\n${roomInfo}` : ''}`,
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
  let freq: 'weekly' | 'biweekly' | 'oddweeks' | 'evenweeks' = 'weekly';

  if (frequency.toLowerCase().includes('biweekly') || frequency.toLowerCase().includes('bi-weekly')) {
    freq = 'biweekly';
  } else {
    freq = normalizeTimetableFrequency(frequency);
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
