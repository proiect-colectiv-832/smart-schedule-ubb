import axios from 'axios';
import { scrapeAcademicCalendar, getVacations, getFreeDays } from '../src/calendar-subscription/academic-calendar-scraper';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('academic-calendar-scraper vacation parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('detects vacation period even when description is written without diacritics', async () => {
    const html = `
      <html>
        <body>
          <h2 class="title">Structura anului universitar 2025-2026</h2>
          <h1>Linia de studiu română și engleză</h1>
          <table>
            <tr><th>SEMESTRUL II - neterminali</th></tr>
            <tr>
              <td>27.04.2026 - 03.05.2026</td>
              <td>Vacanta de Paste</td>
              <td></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValue({ data: html });

    const structures = await scrapeAcademicCalendar('https://example.com/academic-calendar');
    const roEn = structures.find((s) => s.language === 'ro-en');

    expect(roEn).toBeDefined();
    const vacations = getVacations(roEn!);

    expect(vacations).toHaveLength(1);
    expect(vacations[0].description).toContain('Vacanta de Paste');
  });

  test('separates 2026 preparation from teaching and parses free-day dates without weekday names', async () => {
    mockedAxios.get.mockResolvedValue({ data: `
      <h2 class="title">Structura anului universitar 2026-2027</h2>
      <h1>Limbile de predare română și engleză</h1>
      <table>
        <tr><th>SEMESTRUL I</th></tr>
        <tr><td>24.09.2026 – 25.09.2026</td><td>pregătirea anului universitar</td></tr>
        <tr><td>28.09.2026 – 20.12.2026</td><td>activitate didactică</td><td>12 săptămâni (01.12.2026, Ziua Marii Uniri – zi liberă)</td></tr>
        <tr><td>21.12.2026 – 02.01.2027</td><td>vacanță de Crăciun</td></tr>
        <tr><td>04.01.2027 – 17.01.2027</td><td>activitate didactică</td><td>2 săptămâni (06.01.2027, Boboteaza, și 07.01.2027, Sfântul Ioan Botezătorul – zile libere)</td></tr>
      </table>
    ` });

    const [structure] = await scrapeAcademicCalendar('https://example.com/academic-calendar');

    expect(structure.semesters[0].periods[0].type).toBe('preparation');
    expect(structure.semesters[0].periods.find(period => period.type === 'teaching')?.startDate)
      .toEqual(new Date(2026, 8, 28));
    expect(getFreeDays(structure).map(day => day.startDate.getDate())).toEqual([1, 6, 7]);
  });
});
