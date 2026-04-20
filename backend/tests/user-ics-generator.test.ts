import * as fs from 'fs/promises';
import { UserTimetableEntry } from '../src/database/user-timetable-db';
import { AcademicYearStructure, scrapeAcademicCalendar } from '../src/calendar-subscription/academic-calendar-scraper';
import { generateUserICSFile } from '../src/calendar-subscription/user-ics-generator';

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  writeFile: jest.fn(),
}));

jest.mock('../src/calendar-subscription/room-location-service', () => ({
  formatRoomInfoForDescription: jest.fn().mockResolvedValue(''),
  formatRoomLocationForCalendar: jest.fn().mockResolvedValue(''),
}));

jest.mock('../src/calendar-subscription/academic-calendar-scraper', () => {
  const actual = jest.requireActual('../src/calendar-subscription/academic-calendar-scraper');
  return {
    ...actual,
    scrapeAcademicCalendar: jest.fn(),
  };
});

function extractEventDatesBySummary(ics: string, summary: string): string[] {
  return ics
    .split('BEGIN:VEVENT')
    .slice(1)
    .map((block) => `BEGIN:VEVENT${block}`)
    .filter((block) => block.includes(`SUMMARY:${summary}`))
    .map((block) => {
      const match = block.match(/DTSTART(?:;[^:]+)?:([0-9]{8})T[0-9]{6}/);
      return match?.[1];
    })
    .filter((value): value is string => Boolean(value));
}

describe('user-ics-generator recurrence parity', () => {
  const mockedWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
  const mockedScrape = scrapeAcademicCalendar as jest.MockedFunction<typeof scrapeAcademicCalendar>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps odd/even parity aligned after a full vacation week', async () => {
    const academicStructure: AcademicYearStructure = {
      academicYear: '2025-2026',
      language: 'ro-en',
      lastScraped: new Date(2026, 3, 1),
      semesters: [
        {
          semester: 'II',
          yearType: 'non-terminal',
          periods: [
            {
              startDate: new Date(2026, 1, 16),
              endDate: new Date(2026, 3, 26),
              type: 'teaching',
              description: 'Activitate didactica',
            },
            {
              startDate: new Date(2026, 3, 27),
              endDate: new Date(2026, 4, 3),
              type: 'vacation',
              description: 'Vacanta',
            },
            {
              startDate: new Date(2026, 4, 4),
              endDate: new Date(2026, 5, 7),
              type: 'teaching',
              description: 'Activitate didactica',
            },
          ],
        },
      ],
    };

    mockedScrape.mockResolvedValue([academicStructure]);

    const entries: UserTimetableEntry[] = [
      {
        id: 1,
        day: 'monday',
        interval: {
          start: { hour: 8, minute: 0 },
          end: { hour: 10, minute: 0 },
        },
        subjectName: 'Algoritmi',
        teacher: 'Test Teacher',
        frequency: 'oddweeks',
        type: 'lecture',
        room: '',
        format: '832',
      },
    ];

    await generateUserICSFile('parity-test-user', entries, {
      language: 'ro-en',
      semesterStart: new Date(2026, 3, 20),
      semesterEnd: new Date(2026, 4, 18, 23, 59, 59, 999),
      excludeVacations: true,
      includeFreeDaysAsEvents: false,
      includeVacationsAsEvents: false,
    });

    expect(mockedWriteFile).toHaveBeenCalled();
    const writtenContent = mockedWriteFile.mock.calls[0][1] as string;

    const dates = extractEventDatesBySummary(writtenContent, 'Algoritmi (lecture)');

    expect(dates).toEqual(['20260420', '20260511']);
    expect(dates).not.toContain('20260504');
  });

  test('keeps odd/even parity aligned after vacation for mid-week classes too', async () => {
    const academicStructure: AcademicYearStructure = {
      academicYear: '2025-2026',
      language: 'ro-en',
      lastScraped: new Date(2026, 3, 1),
      semesters: [
        {
          semester: 'II',
          yearType: 'non-terminal',
          periods: [
            {
              startDate: new Date(2026, 1, 16),
              endDate: new Date(2026, 3, 26),
              type: 'teaching',
              description: 'Activitate didactica',
            },
            {
              startDate: new Date(2026, 3, 27),
              endDate: new Date(2026, 4, 3),
              type: 'vacation',
              description: 'Vacanta',
            },
            {
              startDate: new Date(2026, 4, 4),
              endDate: new Date(2026, 5, 7),
              type: 'teaching',
              description: 'Activitate didactica',
            },
          ],
        },
      ],
    };

    mockedScrape.mockResolvedValue([academicStructure]);

    const entries: UserTimetableEntry[] = [
      {
        id: 2,
        day: 'wednesday',
        interval: {
          start: { hour: 10, minute: 0 },
          end: { hour: 12, minute: 0 },
        },
        subjectName: 'Retele',
        teacher: 'Test Teacher',
        frequency: 'oddweeks',
        type: 'lecture',
        room: '',
        format: '832',
      },
    ];

    await generateUserICSFile('parity-test-user-midweek', entries, {
      language: 'ro-en',
      semesterStart: new Date(2026, 3, 20),
      semesterEnd: new Date(2026, 4, 20, 23, 59, 59, 999),
      excludeVacations: true,
      includeFreeDaysAsEvents: false,
      includeVacationsAsEvents: false,
    });

    expect(mockedWriteFile).toHaveBeenCalled();
    const writtenContent = mockedWriteFile.mock.calls[0][1] as string;

    const dates = extractEventDatesBySummary(writtenContent, 'Retele (lecture)');

    expect(dates).toEqual(['20260422', '20260513']);
    expect(dates).not.toContain('20260506');
  });
});

