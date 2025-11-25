/**
 * iCalendar Generator
 * Generates valid iCalendar (.ics) feeds for user timetables
 */

import ical, { ICalCalendar, ICalEventData } from 'ical-generator';
import { UserTimetable, UserEvent, RecurrenceRule } from './user-timetable-manager';
import {
  scrapeAcademicCalendar,
  getVacations,
  getFreeDays,
  isNonTeachingDay,
  AcademicYearStructure
} from './academic-calendar-scraper';

const TIMEZONE = 'Europe/Bucharest';
const CALENDAR_NAME = 'UBB Smart Schedule';
const CALENDAR_DESCRIPTION = 'Your personalized UBB timetable';

// Cache pentru structura academică (să nu facem scraping la fiecare request)
let cachedAcademicStructure: AcademicYearStructure | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ore

/**
 * Obține structura academică (cu cache)
 */
async function getAcademicStructure(language: 'ro-en' | 'hu-de' = 'ro-en'): Promise<AcademicYearStructure | null> {
  try {
    // Verificăm cache-ul
    if (cachedAcademicStructure && cacheTimestamp) {
      const now = new Date();
      if (now.getTime() - cacheTimestamp.getTime() < CACHE_DURATION_MS) {
        return cachedAcademicStructure;
      }
    }

    // Facem scraping dacă cache-ul e expirat
    console.log('Fetching academic calendar structure...');
    const structures = await scrapeAcademicCalendar();

    // Găsim structura pentru limba dorită
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
 * Generate an iCalendar feed from a user's timetable
 * @param timetable - The user's timetable
 * @param userId - The user ID (for calendar metadata)
 * @param options - Generation options
 * @returns iCalendar string
 */
export async function generateICalendar(
  timetable: UserTimetable,
  userId: string,
  options?: {
    includeVacations?: boolean;
    includeExamPeriods?: boolean;
    includeFreeDays?: boolean;
    language?: 'ro-en' | 'hu-de';
    isTerminalYear?: boolean;
  }
): Promise<string> {
  const opts = {
    includeVacations: true,
    includeExamPeriods: true,
    includeFreeDays: true,
    language: 'ro-en' as 'ro-en' | 'hu-de',
    isTerminalYear: false,
    ...options
  };

  const calendar = ical({
    name: CALENDAR_NAME,
    description: CALENDAR_DESCRIPTION,
    timezone: TIMEZONE,
    ttl: 3600, // Refresh every hour
    prodId: {
      company: 'UBB Cluj-Napoca',
      product: 'Smart Schedule',
      language: 'EN'
    },
    url: `https://mytimetable.app/user/${userId}/calendar`,
  });

  // Obținem structura academică
  const academicStructure = await getAcademicStructure(opts.language);

  // Add each event to the calendar (cu filtrare pentru vacanțe)
  for (const event of timetable.events) {
    addEventToCalendar(calendar, event, timetable, academicStructure, opts.isTerminalYear);
  }

  // Adăugăm vacanțele ca evenimente all-day
  if (opts.includeVacations && academicStructure) {
    addVacationEvents(calendar, academicStructure);
  }

  // Adăugăm zilele libere ca evenimente all-day
  if (opts.includeFreeDays && academicStructure) {
    addFreeDayEvents(calendar, academicStructure);
  }

  // Adăugăm perioadele de examene
  if (opts.includeExamPeriods && academicStructure) {
    addExamPeriodEvents(calendar, academicStructure, opts.isTerminalYear);
  }

  return calendar.toString();
}

/**
 * Add vacation events to the calendar
 */
function addVacationEvents(calendar: ICalCalendar, structure: AcademicYearStructure): void {
  const vacations = getVacations(structure);

  for (const vacation of vacations) {
    calendar.createEvent({
      id: `vacation-${vacation.startDate.getTime()}`,
      summary: `🏖️ ${vacation.description}`,
      start: vacation.startDate,
      end: new Date(vacation.endDate.getTime() + 24 * 60 * 60 * 1000), // +1 zi pentru all-day events
      allDay: true,
      description: vacation.notes || 'Vacanță universitară',
      categories: [{ name: 'VACATION' }],
      // @ts-ignore
      color: '#4CAF50', // Verde pentru vacanțe
    });
  }
}

/**
 * Add free day events to the calendar
 */
function addFreeDayEvents(calendar: ICalCalendar, structure: AcademicYearStructure): void {
  const freeDays = getFreeDays(structure);

  for (const freeDay of freeDays) {
    calendar.createEvent({
      id: `free-day-${freeDay.startDate.getTime()}`,
      summary: `🎉 ${freeDay.description}`,
      start: freeDay.startDate,
      end: new Date(freeDay.endDate.getTime() + 24 * 60 * 60 * 1000), // +1 zi pentru all-day events
      allDay: true,
      description: freeDay.notes || 'Zi liberă',
      categories: [{ name: 'FREE-DAY' }],
      // @ts-ignore
      color: '#FF6B6B', // Roșu pentru zile libere
    });
  }
}

/**
 * Add exam period events to the calendar
 */
function addExamPeriodEvents(
  calendar: ICalCalendar,
  structure: AcademicYearStructure,
  isTerminalYear: boolean
): void {
  for (const semester of structure.semesters) {
    // Filtrăm pentru anul corect (terminal vs non-terminal)
    if (semester.semester === 'II' && semester.yearType) {
      if (isTerminalYear && semester.yearType !== 'terminal') continue;
      if (!isTerminalYear && semester.yearType !== 'non-terminal') continue;
    }

    for (const period of semester.periods) {
      let emoji = '';
      let color = '';
      let shouldAdd = false;

      switch (period.type) {
        case 'exams':
          emoji = '📝';
          color = '#FF9800'; // Orange
          shouldAdd = true;
          break;
        case 'retakes':
          emoji = '🔄';
          color = '#FF5722'; // Red-orange
          shouldAdd = true;
          break;
        case 'preparation':
          emoji = '📖';
          color = '#2196F3'; // Blue
          shouldAdd = true;
          break;
        case 'graduation':
          emoji = '🎓';
          color = '#9C27B0'; // Purple
          shouldAdd = true;
          break;
        case 'practice':
          emoji = '💼';
          color = '#00BCD4'; // Cyan
          shouldAdd = true;
          break;
      }

      if (shouldAdd) {
        calendar.createEvent({
          id: `period-${period.type}-${period.startDate.getTime()}`,
          summary: `${emoji} ${period.description}`,
          start: period.startDate,
          end: new Date(period.endDate.getTime() + 24 * 60 * 60 * 1000),
          allDay: true,
          description: period.notes || '',
          categories: [{ name: period.type.toUpperCase() }],
          // @ts-ignore
          color: color,
        });
      }
    }
  }
}

/**
 * Verifică dacă un eveniment cade în vacanță sau zi liberă și ar trebui exclus
 */
function shouldExcludeEvent(
  event: UserEvent,
  structure: AcademicYearStructure | null
): boolean {
  if (!structure) return false;

  // Nu excludem evenimente one-time sau evenimente speciale (custom)
  if (!event.isRecurring) return false;
  if (event.type === 'custom') return false;

  // Verificăm dacă evenimentul începe într-o vacanță sau zi liberă
  const eventDate = new Date(event.startTime);
  return isNonTeachingDay(eventDate, structure);
}

/**
 * Add a single event to the iCalendar
 */
function addEventToCalendar(
  calendar: ICalCalendar,
  event: UserEvent,
  timetable: UserTimetable,
  academicStructure: AcademicYearStructure | null,
  isTerminalYear: boolean
): void {
  // Verificăm dacă evenimentul ar trebui exclus (e în vacanță)
  if (shouldExcludeEvent(event, academicStructure)) {
    return; // Nu adăugăm cursuri care cad în vacanță
  }

  const eventData: ICalEventData = {
    id: event.id,
    summary: event.title,
    start: event.startTime,
    end: event.endTime,
    location: event.location || '',
    description: event.description || '',
    timezone: TIMEZONE,
  };

  // Add event type as category
  eventData.categories = [
    {
      name: event.type.toUpperCase()
    }
  ];

  // Handle recurring events
  if (event.isRecurring && event.recurrenceRule) {
    const rrule = convertToICalRRule(
      event.recurrenceRule,
      event.startTime,
      timetable,
      academicStructure,
      isTerminalYear
    );
    if (rrule) {
      eventData.repeating = rrule;

      // Adăugăm EXDATE pentru vacanțe (exclude specific dates)
      if (academicStructure) {
        const excludeDates = getVacationExcludeDates(event, academicStructure);
        if (excludeDates.length > 0) {
          // @ts-ignore
          eventData.exclusionDates = excludeDates;
        }
      }
    }
  }

  // Add color if specified (some calendar apps support this)
  if (event.color) {
    // @ts-ignore - color is not in the types but is valid iCal
    eventData.color = event.color;
  }

  // Add alarm/reminder for lectures and labs (15 minutes before)
  if (event.type === 'lecture' || event.type === 'lab') {
    eventData.alarms = [
      {
        type: 'display' as any,
        trigger: 900, // 15 minutes before (in seconds)
        description: `${event.title} starts in 15 minutes`
      }
    ];
  }

  calendar.createEvent(eventData);
}

/**
 * Obține datele care trebuie excluse din recurring events (vacanțe)
 */
function getVacationExcludeDates(
  event: UserEvent,
  structure: AcademicYearStructure
): Date[] {
  const excludeDates: Date[] = [];
  const vacations = getVacations(structure);

  // Pentru fiecare vacanță, găsim toate datele când ar cădea acest curs
  for (const vacation of vacations) {
    let currentDate = new Date(vacation.startDate);
    const endDate = vacation.endDate;

    while (currentDate <= endDate) {
      // Verificăm dacă ziua din săptămână se potrivește cu cursul
      const eventDate = new Date(event.startTime);
      if (currentDate.getDay() === eventDate.getDay()) {
        // Creăm o dată exactă cu ora cursului
        const excludeDate = new Date(currentDate);
        excludeDate.setHours(eventDate.getHours());
        excludeDate.setMinutes(eventDate.getMinutes());
        excludeDate.setSeconds(0);
        excludeDate.setMilliseconds(0);
        excludeDates.push(excludeDate);
      }

      // Trecem la următoarea zi
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return excludeDates;
}

/**
 * Convert our recurrence rule format to iCalendar RRule format
 */
function convertToICalRRule(
  rule: RecurrenceRule,
  startTime: Date,
  timetable: UserTimetable,
  academicStructure: AcademicYearStructure | null,
  isTerminalYear: boolean
): any {
  const rrule: any = {
    freq: 'WEEKLY',
  };

  // Set the days of week (iCal format)
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    rrule.byDay = rule.daysOfWeek.map(day => dayMap[day]);
  }

  // Handle different frequency types
  switch (rule.frequency) {
    case 'weekly':
      rrule.freq = 'WEEKLY';
      rrule.interval = 1;
      break;

    case 'biweekly':
      rrule.freq = 'WEEKLY';
      rrule.interval = 2;
      break;

    case 'oddweeks':
      // Odd weeks - every 2 weeks starting from week 1
      rrule.freq = 'WEEKLY';
      rrule.interval = 2;
      // Calculate if we need to adjust start date based on semester start
      if (timetable.semesterStart) {
        const semesterStart = new Date(timetable.semesterStart);
        const weeksSinceSemesterStart = Math.floor(
          (startTime.getTime() - semesterStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        // If current week is even, we need to shift by 1 week
        if (weeksSinceSemesterStart % 2 === 1) {
          rrule.interval = 2;
        }
      }
      break;

    case 'evenweeks':
      // Even weeks - every 2 weeks starting from week 2
      rrule.freq = 'WEEKLY';
      rrule.interval = 2;
      if (timetable.semesterStart) {
        const semesterStart = new Date(timetable.semesterStart);
        const weeksSinceSemesterStart = Math.floor(
          (startTime.getTime() - semesterStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        // If current week is odd, we need to shift by 1 week
        if (weeksSinceSemesterStart % 2 === 0) {
          rrule.interval = 2;
        }
      }
      break;
  }

  // Set end date - folosim structura academică pentru a determina sfârșitul corect
  if (rule.until) {
    rrule.until = rule.until;
  } else if (academicStructure) {
    // Determinăm sfârșitul semestrului bazat pe structura academică
    const semesterEnd = determineSemesterEnd(academicStructure, startTime, isTerminalYear);
    if (semesterEnd) {
      rrule.until = semesterEnd;
    } else if (timetable.semesterEnd) {
      rrule.until = timetable.semesterEnd;
    }
  } else if (timetable.semesterEnd) {
    rrule.until = timetable.semesterEnd;
  } else if (rule.count) {
    rrule.count = rule.count;
  } else {
    // Default to 14 weeks (one semester) from start
    const defaultEnd = new Date(startTime);
    defaultEnd.setDate(defaultEnd.getDate() + (14 * 7));
    rrule.until = defaultEnd;
  }

  return rrule;
}

/**
 * Determină sfârșitul semestrului bazat pe structura academică
 */
function determineSemesterEnd(
  structure: AcademicYearStructure,
  eventDate: Date,
  isTerminalYear: boolean
): Date | null {
  for (const semester of structure.semesters) {
    // Verificăm dacă evenimentul e în acest semestru
    const firstPeriod = semester.periods[0];
    const lastPeriod = semester.periods[semester.periods.length - 1];

    if (!firstPeriod || !lastPeriod) continue;

    if (eventDate >= firstPeriod.startDate && eventDate <= lastPeriod.endDate) {
      // Pentru semestrul II, verificăm tipul de an
      if (semester.semester === 'II' && semester.yearType) {
        if (isTerminalYear && semester.yearType !== 'terminal') continue;
        if (!isTerminalYear && semester.yearType !== 'non-terminal') continue;
      }

      // Găsim ultima perioadă de teaching (activitate didactică)
      for (let i = semester.periods.length - 1; i >= 0; i--) {
        const period = semester.periods[i];
        if (period.type === 'teaching') {
          return period.endDate;
        }
      }

      // Dacă nu găsim, returnăm sfârșitul ultimei perioade
      return lastPeriod.endDate;
    }
  }

  return null;
}

/**
 * Generate iCalendar for a specific date range
 * Useful for generating limited calendars or testing
 */
export async function generateICalendarForDateRange(
  timetable: UserTimetable,
  userId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    includeVacations?: boolean;
    includeExamPeriods?: boolean;
    language?: 'ro-en' | 'hu-de';
    isTerminalYear?: boolean;
  }
): Promise<string> {
  const opts = {
    includeVacations: true,
    includeExamPeriods: true,
    language: 'ro-en' as 'ro-en' | 'hu-de',
    isTerminalYear: false,
    ...options
  };

  const calendar = ical({
    name: `${CALENDAR_NAME} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
    description: CALENDAR_DESCRIPTION,
    timezone: TIMEZONE,
    ttl: 3600,
    prodId: {
      company: 'UBB Cluj-Napoca',
      product: 'Smart Schedule',
      language: 'EN'
    },
  });

  // Obținem structura academică
  const academicStructure = await getAcademicStructure(opts.language);

  // Filter events within the date range
  const filteredEvents = timetable.events.filter(event => {
    const eventStart = new Date(event.startTime);
    return eventStart >= startDate && eventStart <= endDate;
  });

  for (const event of filteredEvents) {
    addEventToCalendar(calendar, event, timetable, academicStructure, opts.isTerminalYear);
  }

  // Adăugăm vacanțele în range-ul specificat
  if (opts.includeVacations && academicStructure) {
    const vacations = getVacations(academicStructure);
    for (const vacation of vacations) {
      if (vacation.startDate >= startDate && vacation.endDate <= endDate) {
        addVacationEvents(calendar, academicStructure);
        break;
      }
    }
  }

  // Adăugăm perioadele de examene
  if (opts.includeExamPeriods && academicStructure) {
    addExamPeriodEvents(calendar, academicStructure, opts.isTerminalYear);
  }

  return calendar.toString();
}

/**
 * Invalidate the academic structure cache (useful for testing or manual refresh)
 */
export function invalidateAcademicCache(): void {
  cachedAcademicStructure = null;
  cacheTimestamp = null;
  console.log('Academic calendar cache invalidated');
}

/**
 * Validate an iCalendar string
 */
export function validateICalendar(icalString: string): { valid: boolean; errors?: string[] } {
  try {
    const errors: string[] = [];

    // Basic validation checks
    if (!icalString.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing BEGIN:VCALENDAR');
    }

    if (!icalString.includes('END:VCALENDAR')) {
      errors.push('Missing END:VCALENDAR');
    }

    if (!icalString.includes('VERSION:')) {
      errors.push('Missing VERSION property');
    }

    if (!icalString.includes('PRODID:')) {
      errors.push('Missing PRODID property');
    }

    // Check for at least one event
    if (!icalString.includes('BEGIN:VEVENT')) {
      errors.push('No events found in calendar');
    }

    // Check that all BEGIN tags have matching END tags
    const beginMatches = icalString.match(/BEGIN:(\w+)/g) || [];
    const endMatches = icalString.match(/END:(\w+)/g) || [];

    if (beginMatches.length !== endMatches.length) {
      errors.push('Mismatched BEGIN/END tags');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      valid: false,
      errors: ['Exception during validation: ' + (error instanceof Error ? error.message : 'Unknown error')]
    };
  }
}

/**
 * Get metadata about a user's timetable for calendar generation
 */
export function getCalendarMetadata(timetable: UserTimetable): {
  totalEvents: number;
  recurringEvents: number;
  oneTimeEvents: number;
  eventsByType: Record<string, number>;
  dateRange: { start: Date | null; end: Date | null };
} {
  const metadata = {
    totalEvents: timetable.events.length,
    recurringEvents: 0,
    oneTimeEvents: 0,
    eventsByType: {} as Record<string, number>,
    dateRange: {
      start: null as Date | null,
      end: null as Date | null
    }
  };

  for (const event of timetable.events) {
    // Count recurring vs one-time
    if (event.isRecurring) {
      metadata.recurringEvents++;
    } else {
      metadata.oneTimeEvents++;
    }

    // Count by type
    metadata.eventsByType[event.type] = (metadata.eventsByType[event.type] || 0) + 1;

    // Track date range
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    if (!metadata.dateRange.start || eventStart < metadata.dateRange.start) {
      metadata.dateRange.start = eventStart;
    }

    if (!metadata.dateRange.end || eventEnd > metadata.dateRange.end) {
      metadata.dateRange.end = eventEnd;
    }
  }

  return metadata;
}
