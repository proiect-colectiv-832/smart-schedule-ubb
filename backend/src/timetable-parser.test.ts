import { load } from 'cheerio';
import axios from 'axios';
import { parseTimetable, parseMultipleTimetables, exportToJson, createTimetableHash } from './timetable-parser';
import { Timetable, TimetableEntry } from './types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Timetable Parser Tests', () => {

  // ==================== NORMAL CASES ====================

  describe('Normal Cases - Complete Timetable', () => {
    const validUrl = 'https://example.com/files/orar/2024-1/tabelar/INFO3.html';

    const completeHtml = `
      <html>
        <body>
          <table>
            <tr>
              <th>Ziua</th>
              <th>Ore</th>
              <th>Frecventa</th>
              <th>Sala</th>
              <th>Formatia</th>
              <th>Tip</th>
              <th>Disciplina</th>
              <th>Titular</th>
            </tr>
            <tr>
              <td>Luni</td>
              <td>08:00-10:00</td>
              <td>sapt. 1-14</td>
              <td>309</td>
              <td>INFO3</td>
              <td>Curs</td>
              <td>Algoritmi Paraleli</td>
              <td>Prof. Dr. Popescu Ion</td>
            </tr>
            <tr>
              <td>Luni</td>
              <td>10:00-12:00</td>
              <td>sapt. 1-14</td>
              <td>Lab 2</td>
              <td>INFO3</td>
              <td>Laborator</td>
              <td>Baze de Date</td>
              <td>Lect. Dr. Ionescu Maria</td>
            </tr>
            <tr>
              <td>Marți</td>
              <td>14:00-16:00</td>
              <td>sapt. 1-7</td>
              <td>Amfiteatru A</td>
              <td>INFO3</td>
              <td>Seminar</td>
              <td>Programare Web</td>
              <td>Conf. Dr. Vasilescu Ana</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: completeHtml });
    });

    test('should correctly parse days of the week', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].day).toBe('Luni');
      expect(result.entries[1].day).toBe('Luni');
      expect(result.entries[2].day).toBe('Marți');
    });

    test('should correctly parse course names', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].subject).toBe('Algoritmi Paraleli');
      expect(result.entries[1].subject).toBe('Baze de Date');
      expect(result.entries[2].subject).toBe('Programare Web');
    });

    test('should correctly parse hours/time intervals', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].hours).toBe('08:00-10:00');
      expect(result.entries[1].hours).toBe('10:00-12:00');
      expect(result.entries[2].hours).toBe('14:00-16:00');
    });

    test('should correctly parse professors/teachers', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].teacher).toBe('Prof. Dr. Popescu Ion');
      expect(result.entries[1].teacher).toBe('Lect. Dr. Ionescu Maria');
      expect(result.entries[2].teacher).toBe('Conf. Dr. Vasilescu Ana');
    });

    test('should correctly parse room numbers', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].room).toBe('309');
      expect(result.entries[1].room).toBe('Lab 2');
      expect(result.entries[2].room).toBe('Amfiteatru A');
    });

    test('should correctly parse type/format (Curs, Laborator, Seminar)', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].type).toBe('Curs');
      expect(result.entries[1].type).toBe('Laborator');
      expect(result.entries[2].type).toBe('Seminar');
    });

    test('should extract metadata from URL', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.academicYear).toBe('2024');
      expect(result.semester).toBe('1');
      expect(result.specialization).toBe('INFO');
      expect(result.yearOfStudy).toBe('3');
    });

    test('should parse frequency information', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].frequency).toBe('sapt. 1-14');
      expect(result.entries[1].frequency).toBe('sapt. 1-14');
      expect(result.entries[2].frequency).toBe('sapt. 1-7');
    });

    test('should parse group/formation information', async () => {
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].group).toBe('INFO3');
      expect(result.entries[1].group).toBe('INFO3');
      expect(result.entries[2].group).toBe('INFO3');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases - Missing Fields', () => {
    const validUrl = 'https://example.com/files/orar/2024-1/tabelar/CS2.html';

    test('should handle missing teacher field', async () => {
      const htmlWithMissingTeacher = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Sala</th>
                <th>Disciplina</th>
                <th>Tip</th>
              </tr>
              <tr>
                <td>Miercuri</td>
                <td>12:00-14:00</td>
                <td>A101</td>
                <td>Matematica</td>
                <td>Curs</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMissingTeacher });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].teacher).toBe('');
      expect(result.entries[0].subject).toBe('Matematica');
    });

    test('should handle missing room field', async () => {
      const htmlWithMissingRoom = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Disciplina</th>
                <th>Titular</th>
                <th>Tip</th>
              </tr>
              <tr>
                <td>Joi</td>
                <td>10:00-12:00</td>
                <td>Fizica</td>
                <td>Dr. Georgescu</td>
                <td>Laborator</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMissingRoom });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].room).toBe('');
      expect(result.entries[0].teacher).toBe('Dr. Georgescu');
    });

    test('should handle missing type/format field', async () => {
      const htmlWithMissingType = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Sala</th>
                <th>Disciplina</th>
                <th>Titular</th>
              </tr>
              <tr>
                <td>Vineri</td>
                <td>08:00-10:00</td>
                <td>B205</td>
                <td>Chimie</td>
                <td>Prof. Mihai</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMissingType });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe('');
    });

    test('should handle missing frequency field', async () => {
      const htmlWithMissingFrequency = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Disciplina</th>
                <th>Tip</th>
              </tr>
              <tr>
                <td>Luni</td>
                <td>16:00-18:00</td>
                <td>Sport</td>
                <td>Practica</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMissingFrequency });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].frequency).toBe('');
    });

    test('should use default group when missing', async () => {
      const htmlWithMissingGroup = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Disciplina</th>
              </tr>
              <tr>
                <td>Marți</td>
                <td>10:00-12:00</td>
                <td>Istoria Artei</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMissingGroup });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      // Should default to specialization + year from URL
      expect(result.entries[0].group).toBe('CS2');
    });
  });

  describe('Edge Cases - Malformed HTML', () => {
    const validUrl = 'https://example.com/files/orar/2023-2/tabelar/MATH1.html';

    test('should handle extra whitespace in cells', async () => {
      const htmlWithWhitespace = `
        <html>
          <body>
            <table>
              <tr>
                <th>  Ziua  </th>
                <th>  Ore  </th>
                <th>  Disciplina  </th>
              </tr>
              <tr>
                <td>   Luni   </td>
                <td>  08:00-10:00  </td>
                <td>   Analiza   Matematica   </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithWhitespace });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].day).toBe('Luni');
      expect(result.entries[0].hours).toBe('08:00-10:00');
      expect(result.entries[0].subject).toBe('Analiza Matematica');
    });

    test('should handle non-breaking spaces', async () => {
      const htmlWithNbsp = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Disciplina</th>
                <th>Titular</th>
              </tr>
              <tr>
                <td>Miercuri</td>
                <td>Geometrie&nbsp;Diferentiala</td>
                <td>Prof.&nbsp;Dr.&nbsp;Popa</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithNbsp });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].subject).toBe('Geometrie Diferentiala');
      expect(result.entries[0].teacher).toBe('Prof. Dr. Popa');
    });

    test('should handle multiple commas in teacher names', async () => {
      const htmlWithMultipleTeachers = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Disciplina</th>
                <th>Titular</th>
              </tr>
              <tr>
                <td>Joi</td>
                <td>Proiect</td>
                <td>Dr. Pop,Dr. Muresan,Dr. Radu</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithMultipleTeachers });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      // Should normalize commas with proper spacing
      expect(result.entries[0].teacher).toBe('Dr. Pop, Dr. Muresan, Dr. Radu');
    });

    test('should skip empty rows', async () => {
      const htmlWithEmptyRows = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Disciplina</th>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Vineri</td>
                <td>12:00-14:00</td>
                <td>Statistica</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithEmptyRows });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].subject).toBe('Statistica');
    });

    test('should handle rows with no td elements', async () => {
      const htmlWithNoTds = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Disciplina</th>
                <th>Ore</th>
              </tr>
              <tr></tr>
              <tr>
                <td>Luni</td>
                <td>Algebra</td>
                <td>10:00-12:00</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlWithNoTds });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].subject).toBe('Algebra');
      expect(result.entries[0].day).toBe('Luni');
      expect(result.entries[0].hours).toBe('10:00-12:00');
    });
  });

  describe('Edge Cases - Empty Timetable', () => {
    const validUrl = 'https://example.com/files/orar/2024-1/tabelar/TEST1.html';

    test('should handle table with only headers', async () => {
      const htmlOnlyHeaders = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ore</th>
                <th>Disciplina</th>
                <th>Titular</th>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlOnlyHeaders });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(0);
      expect(result.academicYear).toBe('2024');
      expect(result.semester).toBe('1');
    });

    test('should throw error when no table found', async () => {
      const htmlNoTable = `
        <html>
          <body>
            <p>No timetable available</p>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlNoTable });

      await expect(parseTimetable(validUrl)).rejects.toThrow('Could not locate timetable table');
    });

    test('should throw error when table has too few columns', async () => {
      const htmlFewColumns = `
        <html>
          <body>
            <table>
              <tr>
                <th>Col1</th>
                <th>Col2</th>
              </tr>
              <tr>
                <td>Data1</td>
                <td>Data2</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: htmlFewColumns });

      await expect(parseTimetable(validUrl)).rejects.toThrow('Could not locate timetable table');
    });
  });

  describe('Edge Cases - Different Header Variations', () => {
    const validUrl = 'https://example.com/files/orar/2024-1/tabelar/INFO1.html';

    test('should recognize "Zi" as day column', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <th>Zi</th>
                <th>Disciplina</th>
                <th>Ora</th>
              </tr>
              <tr>
                <td>Luni</td>
                <td>Programare</td>
                <td>10:00-12:00</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].day).toBe('Luni');
    });

    test('should recognize "Ora" as hours column', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Ora</th>
                <th>Disciplina</th>
              </tr>
              <tr>
                <td>Marți</td>
                <td>14:00-16:00</td>
                <td>Fizica</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].hours).toBe('14:00-16:00');
    });

    test('should recognize "Materie" as subject column', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <th>Ziua</th>
                <th>Materie</th>
                <th>Ore</th>
              </tr>
              <tr>
                <td>Miercuri</td>
                <td>Biologie</td>
                <td>08:00-10:00</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].subject).toBe('Biologie');
    });
  });

  describe('URL Validation', () => {
    test('should throw error for invalid URL format', async () => {
      const invalidUrl = 'https://example.com/invalid/path.html';

      await expect(parseTimetable(invalidUrl)).rejects.toThrow(
        'URL does not match expected pattern'
      );
    });

    test('should parse valid URL with different specialization', async () => {
      const url = 'https://example.com/files/orar/2023-2/tabelar/CS1.html';
      const html = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Disciplina</th><th>Ore</th></tr>
              <tr><td>Luni</td><td>Algoritmi</td><td>10:00-12:00</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(url);

      expect(result.academicYear).toBe('2023');
      expect(result.semester).toBe('2');
      expect(result.specialization).toBe('CS');
      expect(result.yearOfStudy).toBe('1');
    });
  });

  describe('Multiple Timetables Parsing', () => {
    test('should parse multiple timetables successfully', async () => {
      const url1 = 'https://example.com/files/orar/2024-1/tabelar/INFO1.html';
      const url2 = 'https://example.com/files/orar/2024-1/tabelar/INFO2.html';

      const html1 = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Disciplina</th><th>Ore</th></tr>
              <tr><td>Luni</td><td>Java</td><td>08:00-10:00</td></tr>
            </table>
          </body>
        </html>
      `;

      const html2 = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Disciplina</th><th>Ore</th></tr>
              <tr><td>Marți</td><td>Python</td><td>10:00-12:00</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get
        .mockResolvedValueOnce({ data: html1 })
        .mockResolvedValueOnce({ data: html2 });

      const results = await parseMultipleTimetables([url1, url2]);

      expect(results).toHaveLength(2);
      expect(results[0].entries[0].subject).toBe('Java');
      expect(results[1].entries[0].subject).toBe('Python');
    });

    test('should handle partial failures in multiple timetables', async () => {
      const url1 = 'https://example.com/files/orar/2024-1/tabelar/INFO1.html';
      const url2 = 'https://example.com/files/orar/2024-1/tabelar/INFO2.html';

      const html1 = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Disciplina</th><th>Ore</th></tr>
              <tr><td>Luni</td><td>C++</td><td>14:00-16:00</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get
        .mockResolvedValueOnce({ data: html1 })
        .mockRejectedValueOnce(new Error('Network error'));

      const results = await parseMultipleTimetables([url1, url2]);

      // Should return only successful results
      expect(results).toHaveLength(1);
      expect(results[0].entries[0].subject).toBe('C++');
    });
  });

  describe('Utility Functions', () => {
    test('should export timetable to pretty JSON', () => {
      const timetable: Timetable = {
        academicYear: '2024',
        semester: '1',
        specialization: 'INFO',
        yearOfStudy: '3',
        entries: [
          {
            day: 'Luni',
            hours: '10:00-12:00',
            frequency: 'sapt. 1-14',
            room: '309',
            group: 'INFO3',
            type: 'Curs',
            subject: 'AI',
            teacher: 'Dr. Test',
          },
        ],
      };

      const json = exportToJson(timetable, true);

      expect(json).toContain('"academicYear": "2024"');
      expect(json).toContain('"subject": "AI"');
      expect(JSON.parse(json)).toEqual(timetable);
    });

    test('should export timetable to compact JSON', () => {
      const timetable: Timetable = {
        academicYear: '2024',
        semester: '1',
        specialization: 'INFO',
        yearOfStudy: '3',
        entries: [],
      };

      const json = exportToJson(timetable, false);

      expect(json).not.toContain('\n');
      expect(JSON.parse(json)).toEqual(timetable);
    });

    test('should create consistent hash for same timetable', () => {
      const timetable: Timetable = {
        academicYear: '2024',
        semester: '1',
        specialization: 'CS',
        yearOfStudy: '2',
        entries: [
          {
            day: 'Marți',
            hours: '08:00-10:00',
            frequency: 'sapt. 1-14',
            room: 'A101',
            group: 'CS2',
            type: 'Laborator',
            subject: 'Data Structures',
            teacher: 'Prof. Smith',
          },
        ],
      };

      const hash1 = createTimetableHash(timetable);
      const hash2 = createTimetableHash(timetable);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hash
    });

    test('should create different hashes for different timetables', () => {
      const timetable1: Timetable = {
        academicYear: '2024',
        semester: '1',
        specialization: 'INFO',
        yearOfStudy: '1',
        entries: [],
      };

      const timetable2: Timetable = {
        academicYear: '2024',
        semester: '2',
        specialization: 'INFO',
        yearOfStudy: '1',
        entries: [],
      };

      const hash1 = createTimetableHash(timetable1);
      const hash2 = createTimetableHash(timetable2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Special Characters and Edge Cases', () => {
    const validUrl = 'https://example.com/files/orar/2024-1/tabelar/INFO2.html';

    test('should handle special characters in course names', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Disciplina</th><th>Ore</th></tr>
              <tr><td>Luni</td><td>C++ & Algoritmi (Avansați)</td><td>10:00-12:00</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].subject).toContain('C++');
      expect(result.entries[0].subject).toContain('Algoritmi');
    });

    test('should handle numbers in room names', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Sala</th><th>Disciplina</th></tr>
              <tr><td>Marți</td><td>Lab 3.14</td><td>Math</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries[0].room).toBe('Lab 3.14');
    });

    test('should handle various time formats', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th></tr>
              <tr><td>Miercuri</td><td>8:00 - 10:00</td><td>Course1</td></tr>
              <tr><td>Joi</td><td>14:00-16:00</td><td>Course2</td></tr>
              <tr><td>Vineri</td><td>16.00-18.00</td><td>Course3</td></tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].hours).toBe('8:00 - 10:00');
      expect(result.entries[1].hours).toBe('14:00-16:00');
      expect(result.entries[2].hours).toBe('16.00-18.00');
    });
  });
});

