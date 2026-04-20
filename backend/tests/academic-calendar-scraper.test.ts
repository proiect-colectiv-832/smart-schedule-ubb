import axios from 'axios';
import { scrapeAcademicCalendar, getVacations } from '../src/calendar-subscription/academic-calendar-scraper';

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
});

