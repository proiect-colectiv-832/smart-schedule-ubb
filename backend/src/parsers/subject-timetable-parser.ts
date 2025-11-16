import axios from 'axios';
import { load } from 'cheerio';
import { TimetableEntry } from '../types';

/**
 * Parses an individual subject timetable page (e.g., MLM0019.html)
 * These pages have a different structure than group timetables:
 * - No "Disciplina" column (since entire page is for one subject)
 * - Columns: Ziua, Orele, Frecventa, Sala, Anul, Formatia, Tipul, Cadrul didactic
 */
export async function parseSubjectTimetable(url: string, subjectName: string): Promise<TimetableEntry[]> {
  try {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      transformResponse: (d) => d,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const $ = load(response.data);
    const entries: TimetableEntry[] = [];

    // Find the timetable table
    const tables = $('table');
    if (tables.length === 0) {
      return entries; // No tables found, return empty
    }

    // Use the first table (should be the timetable)
    const $table = $(tables[0]);
    const $rows = $table.find('tr');

    // Find header row to get column indices
    const $headerRow = $($rows[0]);
    const headers = $headerRow.find('th').map((_, el) => $(el).text().trim().toLowerCase()).get();

    const colIndices = {
      day: headers.indexOf('ziua'),
      hours: headers.indexOf('orele'),
      frequency: headers.indexOf('frecventa'),
      room: headers.indexOf('sala'),
      year: headers.indexOf('anul'),
      group: headers.indexOf('formatia'),
      type: headers.indexOf('tipul'),
      teacher: headers.indexOf('cadrul didactic')
    };

    // Parse data rows (skip header)
    $rows.slice(1).each((_, row) => {
      const $cells = $(row).find('td');
      if ($cells.length < 8) return; // Skip invalid rows

      const day = $($cells[colIndices.day]).text().trim();
      const hours = $($cells[colIndices.hours]).text().trim();
      const frequency = $($cells[colIndices.frequency]).text().trim();
      const room = $($cells[colIndices.room]).text().trim();
      const group = $($cells[colIndices.group]).text().trim();
      const type = $($cells[colIndices.type]).text().trim();
      const teacher = $($cells[colIndices.teacher]).text().trim();

      if (!day || !hours) return; // Skip rows without essential data

      entries.push({
        day,
        hours,
        frequency,
        room,
        subject: subjectName, // Use the provided subject name
        type,
        teacher,
        group
      });
    });

    return entries;
  } catch (error) {
    // Silently return empty array for failed parses
    return [];
  }
}
