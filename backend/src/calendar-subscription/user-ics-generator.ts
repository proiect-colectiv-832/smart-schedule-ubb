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
  AcademicYearStructure
} from './academic-calendar-scraper';
import { UserTimetableEntry } from '../database/user-timetable-db';
import { formatRoomInfoForDescription, formatRoomLocationForCalendar } from './room-location-service';
import { getTeachingOccurrences, getTeachingTerm, occurrenceId } from './teaching-weeks';

const TIMEZONE = 'Europe/Bucharest';
const ICS_FILES_DIR = path.join(__dirname, '../../ics-files-for-users');

/**
 * Generate VTIMEZONE component for Europe/Bucharest
 * Required for valid iCalendar files when using TZID
 */
function getVTimezoneComponent(): string {
  return `BEGIN:VTIMEZONE
TZID:Europe/Bucharest
BEGIN:DAYLIGHT
TZOFFSETFROM:+0200
TZOFFSETTO:+0300
TZNAME:EEST
DTSTART:19700329T030000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0300
TZOFFSETTO:+0200
TZNAME:EET
DTSTART:19701025T040000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;
}

// Cache for academic structure
const academicStructureCache = new Map<'ro-en' | 'hu-de', { structure: AcademicYearStructure; timestamp: Date }>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function invalidateUserAcademicCache(): void {
  academicStructureCache.clear();
}

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
    const cached = academicStructureCache.get(language);
    if (cached) {
      const now = new Date();
      if (now.getTime() - cached.timestamp.getTime() < CACHE_DURATION_MS) {
        return cached.structure;
      }
    }

    // Fetch fresh data
    console.log('Fetching academic calendar structure...');
    const structures = await scrapeAcademicCalendar();
    const structure = structures.find(s => s.language === language);

    if (structure) {
      academicStructureCache.set(language, { structure, timestamp: new Date() });
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

/** Return the published teaching bounds for the current semester. */
export async function getCurrentTeachingDates(
  language: 'ro-en' | 'hu-de' = 'ro-en',
  isTerminalYear: boolean = false
): Promise<{ start: Date; end: Date }> {
  const structure = await getAcademicStructure(language);
  if (!structure) throw new Error('Academic structure is unavailable');
  const term = getTeachingTerm(structure, new Date(), isTerminalYear);
  if (!term) throw new Error('Academic structure for the current semester is unavailable');
  const { start, end } = term;
  return { start, end };
}

/**
 * Convert UserTimetableEntry (from frontend JSON) to UserEvent
 */
export async function convertJSONTimetableToEvents(
  entries: UserTimetableEntry[],
  semesterStart: Date,
  semesterEnd: Date
): Promise<UserEvent[]> {
  const events: UserEvent[] = [];

  for (const entry of entries) {
    try {
      const dayOfWeek = parseDayOfWeek(entry.day);
      const firstOccurrence = getNextDayOfWeek(semesterStart, dayOfWeek);

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
        until: semesterEnd,
      };

      // Parse event type
      const type = parseEventType(entry.type);

      // Get room location information
      let roomInfo = '';
      let locationAddress = '';

      if (entry.room) {
        roomInfo = await formatRoomInfoForDescription(entry.room);
        locationAddress = await formatRoomLocationForCalendar(entry.room);
      }

      // Create event
      const event: UserEvent = {
        id: entry.id.toString(),
        title: `${entry.subjectName} (${entry.type})`,
        startTime,
        endTime,
        location: locationAddress || undefined,
        description: `Teacher: ${entry.teacher}\nFormat: ${entry.format}\nType: ${entry.type}${roomInfo ? `\n${roomInfo}` : ''}`,
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

function filterStructureForYearType(
  structure: AcademicYearStructure,
  isTerminalYear: boolean
): AcademicYearStructure {
  const filteredSemesters = structure.semesters.filter((semester) => {
    if (semester.semester !== 'II' || !semester.yearType) {
      return true;
    }
    return isTerminalYear ? semester.yearType === 'terminal' : semester.yearType === 'non-terminal';
  });

  return {
    ...structure,
    semesters: filteredSemesters.length > 0 ? filteredSemesters : structure.semesters,
  };
}

/**
 * Generate ICS file for a user's timetable
 */
export async function generateUserICSFile(
  userId: string,
  entries: UserTimetableEntry[],
  options?: {
    language?: 'ro-en' | 'hu-de';
    isTerminalYear?: boolean;
    semesterStart?: Date;
    semesterEnd?: Date;
    excludeVacations?: boolean;
    includeFreeDaysAsEvents?: boolean;
    includeVacationsAsEvents?: boolean;
  }
): Promise<string> {
  const opts = {
    language: 'ro-en' as 'ro-en' | 'hu-de',
    isTerminalYear: false,
    excludeVacations: true,
    includeFreeDaysAsEvents: true,
    includeVacationsAsEvents: false,
    ...options
  };

  const fullAcademicStructure = await getAcademicStructure(opts.language);
  if (!fullAcademicStructure) throw new Error('Academic structure is unavailable');
  const term = getTeachingTerm(fullAcademicStructure, opts.semesterStart || new Date(), opts.isTerminalYear);
  if (!term) throw new Error('Academic structure for the requested semester is unavailable');
  const semesterStart = opts.semesterStart && opts.semesterStart > term.start
    ? opts.semesterStart : term.start;
  const semesterEnd = opts.semesterEnd && opts.semesterEnd < term.end
    ? opts.semesterEnd : term.end;

  // Convert JSON timetable to events
  const events = await convertJSONTimetableToEvents(
    entries,
    semesterStart,
    semesterEnd
  );

  const academicStructure = filterStructureForYearType(fullAcademicStructure, opts.isTerminalYear);

  // Create calendar with VTIMEZONE component
  const calendar = ical({
    name: 'UBB Smart Schedule',
    description: `Personalized timetable for user ${userId}`,
    timezone: {
      name: TIMEZONE,
      generator: getVTimezoneComponent
    },
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
    const occurrences = getTeachingOccurrences(event, academicStructure, term);

    for (const occurrence of occurrences) {
      calendar.createEvent({
        id: occurrenceId(userId, event.id, occurrence.start),
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
        id: `free-day-${freeDay.startDate.getTime()}`,
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
        id: `vacation-${vacation.startDate.getTime()}`,
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
