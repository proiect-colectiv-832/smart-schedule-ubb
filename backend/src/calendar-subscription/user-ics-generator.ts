/**
 * User ICS Generator Service
 * Generates ICS files for user timetables based on JSON data from frontend
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import ical from 'ical-generator';
import { UserEvent, RecurrenceRule } from './user-timetable-manager';
import {
  scrapeAcademicCalendar,
  getVacations,
  getFreeDays,
  isNonTeachingDay,
  AcademicYearStructure
} from './academic-calendar-scraper';
import { UserTimetableEntry } from '../database/user-timetable-db';

const TIMEZONE = 'Europe/Bucharest';
const ICS_FILES_DIR = path.join(__dirname, '../../ics-files-for-users');

// Cache for academic structure
let cachedAcademicStructure: AcademicYearStructure | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize ICS files directory
 */
export async function initializeICSDirectory(): Promise<void> {
  try {
    await fs.mkdir(ICS_FILES_DIR, { recursive: true });
    console.log('📁 ICS files directory initialized');
  } catch (error) {
    console.error('Error initializing ICS directory:', error);
    throw error;
  }
}

/**
 * Get academic structure with caching
 */
async function getAcademicStructure(language: 'ro-en' | 'hu-de' = 'ro-en'): Promise<AcademicYearStructure | null> {
  try {
    // Check cache
    if (cachedAcademicStructure && cacheTimestamp) {
      const now = new Date();
      if (now.getTime() - cacheTimestamp.getTime() < CACHE_DURATION_MS) {
        return cachedAcademicStructure;
      }
    }

    // Fetch fresh data
    console.log('Fetching academic calendar structure...');
    const structures = await scrapeAcademicCalendar();
    const structure = structures.find(s => s.language === language);

    if (structure) {
      cachedAcademicStructure = structure;
      cacheTimestamp = new Date();
      console.log(`Academic calendar cached for ${structure.academicYear}`);
      return structure;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch academic calendar:', error);
    return null;
  }
}

/**
 * Parse day string to day of week number
 */
function parseDayOfWeek(day: string): number {
  const dayMap: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
  };
  return dayMap[day.toLowerCase()] ?? 1; // Default to Monday
}

/**
 * Parse frequency string to recurrence rule
 */
function parseFrequency(frequency: string): 'weekly' | 'oddweeks' | 'evenweeks' {
  const freqLower = frequency.toLowerCase();
  if (freqLower === 'oddweeks') return 'oddweeks';
  if (freqLower === 'evenweeks') return 'evenweeks';
  return 'weekly';
}

/**
 * Parse type string to event type
 */
function parseEventType(type: string): 'lecture' | 'lab' | 'seminar' | 'custom' {
  const typeLower = type.toLowerCase();
  if (typeLower === 'lecture') return 'lecture';
  if (typeLower === 'lab') return 'lab';
  if (typeLower === 'seminar') return 'seminar';
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
 */
function getDefaultSemesterDates(): { start: Date; end: Date } {
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
    end = new Date(month >= 9 ? year + 1 : year, 0, 31); // January 31
  }
  // Spring semester (February - June)
  else {
    // Get February 1st
    const feb1 = new Date(year, 1, 1);
    // Get the Monday of the week containing February 1st
    start = getMondayOfWeek(feb1);
    end = new Date(year, 5, 30); // June 30
  }

  return { start, end };
}

/**
 * Convert UserTimetableEntry (from frontend JSON) to UserEvent
 */
export function convertJSONTimetableToEvents(
  entries: UserTimetableEntry[],
  semesterStart?: Date,
  semesterEnd?: Date
): UserEvent[] {
  const { start: defaultStart, end: defaultEnd } = getDefaultSemesterDates();
  const start = semesterStart || defaultStart;
  const end = semesterEnd || defaultEnd;

  const events: UserEvent[] = [];

  for (const entry of entries) {
    try {
      const dayOfWeek = parseDayOfWeek(entry.day);
      const firstOccurrence = getNextDayOfWeek(start, dayOfWeek);

      // Create start time
      const startTime = new Date(firstOccurrence);
      startTime.setHours(entry.interval.start.hour, entry.interval.start.minute, 0, 0);

      // Create end time
      const endTime = new Date(firstOccurrence);
      endTime.setHours(entry.interval.end.hour, entry.interval.end.minute, 0, 0);

      // Parse recurrence rule
      const frequency = parseFrequency(entry.frequency);
      const recurrenceRule: RecurrenceRule = {
        frequency,
        daysOfWeek: [dayOfWeek],
        until: end,
      };

      // Parse event type
      const type = parseEventType(entry.type);

      // Create event
      const event: UserEvent = {
        id: entry.id.toString(),
        title: `${entry.subjectName} (${entry.type})`,
        startTime,
        endTime,
        location: entry.room || undefined,
        description: `Teacher: ${entry.teacher}\nFormat: ${entry.format}\nType: ${entry.type}`,
        isRecurring: true,
        recurrenceRule,
        type,
      };

      events.push(event);
    } catch (error) {
      console.error('Error converting entry:', entry, error);
    }
  }

  return events;
}

/**
 * Check if a date falls during a vacation period or free day
 */
function isDateInVacation(date: Date, structure: AcademicYearStructure | null): boolean {
  if (!structure) return false;
  return isNonTeachingDay(date, structure);
}

/**
 * Generate all occurrences of a recurring event
 */
function generateEventOccurrences(
  event: UserEvent,
  structure: AcademicYearStructure | null,
  excludeVacations: boolean = true
): Array<{ start: Date; end: Date }> {
  const occurrences: Array<{ start: Date; end: Date }> = [];

  if (!event.isRecurring || !event.recurrenceRule) {
    return [{ start: event.startTime, end: event.endTime }];
  }

  const rule = event.recurrenceRule;
  const until = rule.until || new Date(event.startTime.getFullYear() + 1, 5, 30);

  let currentDate = new Date(event.startTime);
  let weekNumber = 0;

  while (currentDate <= until) {
    // Check frequency rule
    let shouldInclude = true;

    if (rule.frequency === 'oddweeks' && weekNumber % 2 !== 0) {
      shouldInclude = false;
    } else if (rule.frequency === 'evenweeks' && weekNumber % 2 === 0) {
      shouldInclude = false;
    }

    // Check if during vacation
    if (shouldInclude && excludeVacations && isDateInVacation(currentDate, structure)) {
      shouldInclude = false;
    }

    if (shouldInclude) {
      const start = new Date(currentDate);
      start.setHours(event.startTime.getHours(), event.startTime.getMinutes(), 0, 0);

      const end = new Date(currentDate);
      end.setHours(event.endTime.getHours(), event.endTime.getMinutes(), 0, 0);

      occurrences.push({ start, end });
    }

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;
  }

  return occurrences;
}

/**
 * Generate ICS file for a user's timetable
 */
export async function generateUserICSFile(
  userId: string,
  entries: UserTimetableEntry[],
  options?: {
    language?: 'ro-en' | 'hu-de';
    semesterStart?: Date;
    semesterEnd?: Date;
    excludeVacations?: boolean;
    includeFreeDaysAsEvents?: boolean;
    includeVacationsAsEvents?: boolean;
  }
): Promise<string> {
  const opts = {
    language: 'ro-en' as 'ro-en' | 'hu-de',
    excludeVacations: true,
    includeFreeDaysAsEvents: true,
    includeVacationsAsEvents: false,
    ...options
  };

  // Convert JSON timetable to events
  const events = convertJSONTimetableToEvents(
    entries,
    opts.semesterStart,
    opts.semesterEnd
  );

  // Get academic structure
  const academicStructure = await getAcademicStructure(opts.language);

  // Create calendar
  const calendar = ical({
    name: 'UBB Smart Schedule',
    description: `Personalized timetable for user ${userId}`,
    timezone: TIMEZONE,
    ttl: 3600,
    prodId: {
      company: 'UBB Cluj-Napoca',
      product: 'Smart Schedule',
      language: 'EN'
    },
    url: `https://smart-schedule-ubb.app/calendar/${userId}`,
  });

  // Add events to calendar
  for (const event of events) {
    const occurrences = generateEventOccurrences(
      event,
      academicStructure,
      opts.excludeVacations
    );

    for (const occurrence of occurrences) {
      calendar.createEvent({
        start: occurrence.start,
        end: occurrence.end,
        summary: event.title,
        description: event.description,
        location: event.location,
        timezone: TIMEZONE,
      });
    }
  }

  // Add free days as all-day events
  if (opts.includeFreeDaysAsEvents && academicStructure) {
    const freeDays = getFreeDays(academicStructure);
    for (const freeDay of freeDays) {
      calendar.createEvent({
        start: freeDay.startDate,
        end: new Date(freeDay.endDate.getTime() + 24 * 60 * 60 * 1000), // +1 day for all-day events
        summary: `🎉 ${freeDay.description}`,
        description: freeDay.notes || 'Zi liberă',
        allDay: true,
        timezone: TIMEZONE,
      });
    }
  }

  // Add vacations as all-day events
  if (opts.includeVacationsAsEvents && academicStructure) {
    const vacations = getVacations(academicStructure);
    for (const vacation of vacations) {
      calendar.createEvent({
        start: vacation.startDate,
        end: new Date(vacation.endDate.getTime() + 24 * 60 * 60 * 1000), // +1 day for all-day events
        summary: `🏖️ ${vacation.description}`,
        description: vacation.notes || 'Vacanță universitară',
        allDay: true,
        timezone: TIMEZONE,
      });
    }
  }

  // Generate ICS string
  const icsContent = calendar.toString();

  // Save to file
  const filePath = path.join(ICS_FILES_DIR, `${userId}.ics`);
  await fs.writeFile(filePath, icsContent, 'utf-8');

  console.log(`✅ Generated ICS file for user ${userId} (${events.length} events)`);

  return filePath;
}

/**
 * Get ICS file path for a user
 */
export function getUserICSFilePath(userId: string): string {
  return path.join(ICS_FILES_DIR, `${userId}.ics`);
}

/**
 * Check if ICS file exists for a user
 */
export async function userICSFileExists(userId: string): Promise<boolean> {
  try {
    const filePath = getUserICSFilePath(userId);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete ICS file for a user
 */
export async function deleteUserICSFile(userId: string): Promise<boolean> {
  try {
    const filePath = getUserICSFilePath(userId);
    await fs.unlink(filePath);
    console.log(`🗑️  Deleted ICS file for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting ICS file for user ${userId}:`, error);
    return false;
  }
}

/**
 * Get all ICS files
 */
export async function getAllICSFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(ICS_FILES_DIR);
    return files.filter(f => f.endsWith('.ics'));
  } catch (error) {
    console.error('Error reading ICS files directory:', error);
    return [];
  }
}

