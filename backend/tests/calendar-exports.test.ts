import * as fs from 'fs/promises';
import { AcademicYearStructure, scrapeAcademicCalendar } from '../src/calendar-subscription/academic-calendar-scraper';
import { generateICalendar, generateICalendarForDateRange, invalidateAcademicCache } from '../src/calendar-subscription/icalendar-generator';
import { getCurrentTeachingDates, generateUserICSFile, invalidateUserAcademicCache } from '../src/calendar-subscription/user-ics-generator';
import { normalizeTimetableFrequency } from '../src/calendar-subscription/timetable-frequency';
import { UserTimetable, UserEvent } from '../src/calendar-subscription/user-timetable-manager';
import { UserTimetableEntry } from '../src/database/user-timetable-db';

jest.mock('fs/promises', () => ({ ...jest.requireActual('fs/promises'), writeFile: jest.fn() }));
jest.mock('../src/calendar-subscription/room-location-service', () => ({
  formatRoomInfoForDescription: jest.fn().mockResolvedValue(''),
  formatRoomLocationForCalendar: jest.fn().mockResolvedValue(''),
}));
jest.mock('../src/calendar-subscription/academic-calendar-scraper', () => ({
  ...jest.requireActual('../src/calendar-subscription/academic-calendar-scraper'),
  scrapeAcademicCalendar: jest.fn(),
}));

const mockedScrape = scrapeAcademicCalendar as jest.MockedFunction<typeof scrapeAcademicCalendar>;
const mockedWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

function period(start: Date, end: Date, type: 'teaching' | 'vacation' | 'exams' | 'free-day') {
  return { startDate: start, endDate: end, type, description: type };
}

function academicStructure(): AcademicYearStructure {
  return {
    academicYear: '2026-2027',
    language: 'ro-en',
    lastScraped: new Date(2026, 8, 26),
    semesters: [
      { semester: 'I', periods: [
        { startDate: new Date(2026, 8, 24), endDate: new Date(2026, 8, 25), type: 'preparation', description: 'pregătirea anului universitar' },
        period(new Date(2026, 8, 28), new Date(2026, 11, 20), 'teaching'),
        period(new Date(2026, 11, 1), new Date(2026, 11, 1), 'free-day'),
        period(new Date(2026, 11, 21), new Date(2027, 0, 2), 'vacation'),
        period(new Date(2027, 0, 4), new Date(2027, 0, 17), 'teaching'),
        period(new Date(2027, 0, 6), new Date(2027, 0, 6), 'free-day'),
        period(new Date(2027, 0, 18), new Date(2027, 1, 7), 'exams'),
      ] },
      { semester: 'II', yearType: 'non-terminal', periods: [
        period(new Date(2027, 1, 22), new Date(2027, 4, 2), 'teaching'),
        period(new Date(2027, 4, 3), new Date(2027, 4, 9), 'vacation'),
        period(new Date(2027, 4, 10), new Date(2027, 5, 6), 'teaching'),
      ] },
      { semester: 'II', yearType: 'terminal', periods: [
        period(new Date(2027, 1, 22), new Date(2027, 4, 2), 'teaching'),
        period(new Date(2027, 4, 3), new Date(2027, 4, 9), 'vacation'),
        period(new Date(2027, 4, 10), new Date(2027, 4, 23), 'teaching'),
      ] },
    ],
  };
}

function entry(day: string, frequency: string, subjectName = frequency): UserTimetableEntry {
  return {
    id: subjectName.length,
    day,
    interval: { start: { hour: 8, minute: 0 }, end: { hour: 10, minute: 0 } },
    subjectName,
    teacher: 'Teacher',
    frequency,
    type: 'lecture',
    room: '',
    format: '831',
  };
}

function datesFor(ics: string, summary: string): string[] {
  return ics.split('BEGIN:VEVENT').slice(1)
    .filter(block => block.includes(`SUMMARY:${summary}`))
    .map(block => block.match(/DTSTART(?:;[^:]+)?:([0-9]{8})T/)?.[1])
    .filter((date): date is string => Boolean(date));
}

function event(day: number, frequency: 'oddweeks' | 'evenweeks'): UserEvent {
  return {
    id: frequency,
    title: frequency,
    startTime: new Date(2026, 8, 21 + day, 8),
    endTime: new Date(2026, 8, 21 + day, 10),
    isRecurring: true,
    recurrenceRule: { frequency, daysOfWeek: [day + 1] },
    type: 'lecture',
  };
}

describe('calendar exports for academic year 2026-2027', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 26));
    jest.clearAllMocks();
    invalidateAcademicCache();
    invalidateUserAcademicCache();
    mockedScrape.mockResolvedValue([academicStructure()]);
  });

  afterEach(() => jest.useRealTimers());

  test('uses published dates and counts odd/even teaching weeks across Christmas', async () => {
    expect(await getCurrentTeachingDates()).toEqual({ start: new Date(2026, 8, 28), end: new Date(2027, 0, 17) });
    await generateUserICSFile('fall-user', [entry('monday', 'oddweeks'), entry('monday', 'evenweeks'), entry('tuesday', 'weekly')], {
      includeFreeDaysAsEvents: false,
    });
    const ics = mockedWriteFile.mock.calls[0][1] as string;

    expect(datesFor(ics, 'oddweeks (lecture)')).toEqual(expect.arrayContaining(['20260928', '20261012', '20270104']));
    expect(datesFor(ics, 'evenweeks (lecture)')).toEqual(expect.arrayContaining(['20261005', '20261019', '20270111']));
    expect(datesFor(ics, 'weekly (lecture)')).not.toContain('20261201');
    expect(datesFor(ics, 'oddweeks (lecture)')).not.toContain('20260921');
    expect(datesFor(ics, 'oddweeks (lecture)')).not.toContain('20261221');
    expect(datesFor(ics, 'oddweeks (lecture)')).not.toContain('20270118');

    await generateUserICSFile('fall-user', [entry('monday', 'oddweeks')]);
    const repeated = mockedWriteFile.mock.calls[1][1] as string;
    expect(ics).toContain('UID:fall-user-8-20260928');
    expect(repeated).toContain('UID:fall-user-8-20260928');
  });

  test('token feed and date-range preview align old September 21 starts to teaching weeks', async () => {
    const timetable: UserTimetable = {
      userId: 'legacy-user',
      lastModified: '2026-09-26',
      semesterStart: new Date(2026, 8, 21),
      events: [event(0, 'oddweeks'), event(0, 'evenweeks')],
    };
    const ics = await generateICalendar(timetable, timetable.userId, {
      includeVacations: false, includeExamPeriods: false, includeFreeDays: false,
    });
    expect(datesFor(ics, 'oddweeks')).toContain('20260928');
    expect(datesFor(ics, 'oddweeks')).toContain('20270104');
    expect(datesFor(ics, 'evenweeks')).toContain('20261005');
    expect(datesFor(ics, 'oddweeks')).not.toContain('20260921');
    expect(ics).toContain('UID:legacy-user-oddweeks-20260928');

    const preview = await generateICalendarForDateRange(timetable, timetable.userId,
      new Date(2026, 9, 1), new Date(2026, 9, 15),
      { includeVacations: false, includeExamPeriods: false });
    expect(datesFor(preview, 'evenweeks')).toEqual(['20261005']);
  });

  test('resets parity in spring and stops terminal-year classes earlier', async () => {
    jest.setSystemTime(new Date(2027, 1, 20));
    await generateUserICSFile('non-terminal', [entry('monday', 'oddweeks')], {
      isTerminalYear: false, includeFreeDaysAsEvents: false,
    });
    await generateUserICSFile('terminal', [entry('monday', 'oddweeks')], {
      isTerminalYear: true, includeFreeDaysAsEvents: false,
    });
    const nonTerminal = mockedWriteFile.mock.calls[0][1] as string;
    const terminal = mockedWriteFile.mock.calls[1][1] as string;

    expect(datesFor(nonTerminal, 'oddweeks (lecture)')).toContain('20270222');
    expect(datesFor(nonTerminal, 'oddweeks (lecture)')).toContain('20270510');
    expect(datesFor(nonTerminal, 'oddweeks (lecture)')).toContain('20270524');
    expect(datesFor(terminal, 'oddweeks (lecture)')).toContain('20270510');
    expect(datesFor(terminal, 'oddweeks (lecture)')).not.toContain('20270524');
    expect(datesFor(nonTerminal, 'oddweeks (lecture)')).not.toContain('20270503');
  });

  test('uses the Hungarian and German spring break when that language is selected', async () => {
    jest.setSystemTime(new Date(2027, 1, 20));
    const roEn = academicStructure();
    const huDe = academicStructure();
    huDe.language = 'hu-de';
    huDe.semesters[1].periods = [
      period(new Date(2027, 1, 22), new Date(2027, 2, 28), 'teaching'),
      period(new Date(2027, 2, 29), new Date(2027, 3, 4), 'vacation'),
      period(new Date(2027, 3, 5), new Date(2027, 5, 6), 'teaching'),
    ];
    mockedScrape.mockResolvedValue([roEn, huDe]);

    await generateUserICSFile('ro-user', [entry('monday', 'oddweeks')], {
      language: 'ro-en', includeFreeDaysAsEvents: false,
    });
    await generateUserICSFile('hu-user', [entry('monday', 'oddweeks')], {
      language: 'hu-de', includeFreeDaysAsEvents: false,
    });

    const roDates = datesFor(mockedWriteFile.mock.calls[0][1] as string, 'oddweeks (lecture)');
    const huDates = datesFor(mockedWriteFile.mock.calls[1][1] as string, 'oddweeks (lecture)');
    expect(roDates).toContain('20270405');
    expect(huDates).not.toContain('20270405');
    expect(huDates).toContain('20270322');
  });

  test('normalizes timetable frequencies without mistaking weeks 1-14 for odd weeks', () => {
    expect(normalizeTimetableFrequency('sapt. 1-14')).toBe('weekly');
    expect(normalizeTimetableFrequency('sapt. 1')).toBe('oddweeks');
    expect(normalizeTimetableFrequency('săpt. 2')).toBe('evenweeks');
  });

  test('fails calendar generation when the published academic structure is unavailable', async () => {
    mockedScrape.mockResolvedValue([]);
    await expect(generateUserICSFile('missing', [entry('monday', 'weekly')])).rejects.toThrow('Academic structure is unavailable');
    await expect(generateICalendar({ userId: 'missing', lastModified: '', events: [event(0, 'oddweeks')] }, 'missing'))
      .rejects.toThrow('Academic structure is unavailable');
  });
});
