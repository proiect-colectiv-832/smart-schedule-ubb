import axios from 'axios';
import {
  parseTimetable,
  parseTimetablesByGroup,
  parseMultipleTimetables,
  exportToJson,
  createTimetableHash
} from '../src/timetable-parser';
import { Timetable } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Timetable Parser Tests', () => {
  const validUrl = 'https://example.com/files/orar/2024-1/tabelar/INFO3.html';

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== URL METADATA EXTRACTION ====================
  describe('URL Metadata Extraction', () => {
    test('should extract metadata from standard URL pattern', async () => {
      const html = createSingleGroupHtml('211');
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetable(validUrl);

      expect(result.academicYear).toBe('2024');
      expect(result.semester).toBe('1');
      expect(result.specialization).toBe('INFO');
      expect(result.yearOfStudy).toBe('3');
    });

    test('should throw error for invalid URL format', async () => {
      await expect(parseTimetable('https://example.com/invalid-url.html'))
        .rejects.toThrow('URL does not match expected pattern');
    });
  });

  // ==================== SINGLE GROUP PARSING (parseTimetable) ====================
  describe('parseTimetable() - Single Group', () => {
    test('should parse complete timetable with all fields', async () => {
      const html = createCompleteHtml();
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].day).toBe('Luni');
      expect(result.entries[0].hours).toBe('08:00-10:00');
      expect(result.entries[0].frequency).toBe('sapt. 1-14');
      expect(result.entries[0].room).toBe('309');
      expect(result.entries[0].group).toBe('211/1');
      expect(result.entries[0].type).toBe('Curs');
      expect(result.entries[0].subject).toBe('Algoritmi Paraleli');
      expect(result.entries[0].teacher).toBe('Prof. Dr. Popescu Ion');
    });

    test('should handle missing optional fields', async () => {
      const html = createMinimalHtml();
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].day).toBe('Miercuri');
      expect(result.entries[0].subject).toBe('Matematica');
      expect(result.entries[0].teacher).toBe('');
      expect(result.entries[0].room).toBe('');
    });

    test('should skip empty rows', async () => {
      const html = createHtmlWithEmptyRows();
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].subject).toBe('Fizica');
    });

    test('should correctly extract odd/even week frequencies', async () => {
      const html = `<html><body>
        <h1>Grupa 311</h1>
        <table>
          <tr>
            <th>Ziua</th><th>Ore</th><th>Frecventa</th><th>Sala</th>
            <th>Formatia</th><th>Tip</th><th>Disciplina</th><th>Titular</th>
          </tr>
          <tr>
            <td>Joi</td><td>8-10</td><td>sapt. 1</td><td>L001</td>
            <td>MIE3</td><td>Laborator</td><td>Instrumente CASE</td><td>Conf. CHIOREAN Dan</td>
          </tr>
          <tr>
            <td>Joi</td><td>8-10</td><td>sapt. 2</td><td>L001</td>
            <td>MIE3</td><td>Laborator</td><td>Baze de Date</td><td>Lect. Popescu Ion</td>
          </tr>
          <tr>
            <td>Vineri</td><td>10-12</td><td>sapt. 1-14</td><td>C309</td>
            <td>MIE3</td><td>Curs</td><td>Algoritmi</td><td>Prof. Ionescu Maria</td>
          </tr>
        </table>
      </body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetable(validUrl);

      expect(result.entries).toHaveLength(3);

      // Check odd week (săptămână impară)
      expect(result.entries[0].frequency).toBe('sapt. 1');
      expect(result.entries[0].subject).toBe('Instrumente CASE');

      // Check even week (săptămână pară)
      expect(result.entries[1].frequency).toBe('sapt. 2');
      expect(result.entries[1].subject).toBe('Baze de Date');

      // Check all weeks
      expect(result.entries[2].frequency).toBe('sapt. 1-14');
      expect(result.entries[2].subject).toBe('Algoritmi');
    });
  });

  // ==================== MULTIPLE GROUPS PARSING (parseTimetablesByGroup) ====================
  describe('parseTimetablesByGroup() - Multiple Groups', () => {
    test('should parse multiple groups from H1 headings', async () => {
      const html = createMultipleGroupsHtml(['211', '212', '213']);
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetablesByGroup(validUrl);

      expect(result).toHaveLength(3);
      expect(result[0].groupName).toBe('Grupa 211');
      expect(result[1].groupName).toBe('Grupa 212');
      expect(result[2].groupName).toBe('Grupa 213');
    });

    test('should extract correct entries for each group', async () => {
      const html = createHtmlWithTwoGroups();
      mockedAxios.get.mockResolvedValue({ data: html });

      const result = await parseTimetablesByGroup(validUrl);

      expect(result).toHaveLength(2);
      expect(result[0].entries).toHaveLength(2);
      expect(result[1].entries).toHaveLength(1);

      expect(result[0].entries[0].subject).toBe('Math');
      expect(result[0].entries[0].group).toBe('831/1');
      expect(result[1].entries[0].subject).toBe('Chemistry');
      expect(result[1].entries[0].group).toBe('832/1');
    });

    test('should handle groups with various digit counts', async () => {
      const padding = '<!-- Padding to make page larger than 1000 bytes -->'.repeat(20);
      const html = `<html><body>
        ${padding}
        <h1>Title Page</h1>
        <table><tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr></table>
        <h1>Grupa 11</h1>
        <table>
          <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr>
          <tr><td>Luni</td><td>08:00-10:00</td><td>Subject A</td><td>sapt. 1-14</td><td>Room 101</td></tr>
        </table>
        <h1>Grupa 311</h1>
        <table>
          <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr>
          <tr><td>Marti</td><td>10:00-12:00</td><td>Subject B</td><td>sapt. 1-14</td><td>Room 202</td></tr>
        </table>
        <h1>Grupa 1234</h1>
        <table>
          <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr>
          <tr><td>Miercuri</td><td>12:00-14:00</td><td>Subject C</td><td>sapt. 1-14</td><td>Room 303</td></tr>
        </table>
        <h1>Invalid Group</h1>
        <table><tr><th>Ziua</th><th>Ore</th><th>Disciplina</th></tr></table>
      </body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTimetablesByGroup(validUrl);

      expect(result).toHaveLength(3);
      expect(result[0].groupName).toBe('Grupa 11');
      expect(result[1].groupName).toBe('Grupa 311');
      expect(result[2].groupName).toBe('Grupa 1234');
    });

    test('should throw error when no groups found', async () => {
      const padding = '<!-- Padding to make page larger than 1000 bytes -->'.repeat(20);
      const html = `<html><body>
        ${padding}
        <h1>No Groups Here</h1>
        <table>
          <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr>
          <tr><td>Luni</td><td>08:00-10:00</td><td>Test</td><td>sapt. 1-14</td><td>Room</td></tr>
        </table>
        <h1>Another Invalid H1</h1>
        <table>
          <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Frecventa</th><th>Sala</th></tr>
          <tr><td>Marti</td><td>10:00-12:00</td><td>Test2</td><td>sapt. 1-14</td><td>Room2</td></tr>
        </table>
      </body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });

      await expect(parseTimetablesByGroup(validUrl))
        .rejects.toThrow('Could not locate any group timetables');
    });
  });

  // ==================== MULTIPLE TIMETABLES ====================
  describe('parseMultipleTimetables()', () => {
    test('should parse multiple URLs successfully', async () => {
      const html1 = createSingleGroupHtml('111');
      const html2 = createSingleGroupHtml('211');

      mockedAxios.get
        .mockResolvedValueOnce({ data: html1 })
        .mockResolvedValueOnce({ data: html2 });

      const urls = [
        'https://example.com/files/orar/2024-1/tabelar/CS1.html',
        'https://example.com/files/orar/2024-1/tabelar/CS2.html'
      ];

      const results = await parseMultipleTimetables(urls);

      expect(results).toHaveLength(2);
      expect(results[0].yearOfStudy).toBe('1');
      expect(results[1].yearOfStudy).toBe('2');
    });

    test('should handle partial failures gracefully', async () => {
      const html1 = createSingleGroupHtml('111');

      mockedAxios.get
        .mockResolvedValueOnce({ data: html1 })
        .mockRejectedValueOnce(new Error('Network error'));

      const urls = [
        'https://example.com/files/orar/2024-1/tabelar/CS1.html',
        'https://example.com/files/orar/2024-1/tabelar/CS2.html'
      ];

      const results = await parseMultipleTimetables(urls);

      expect(results).toHaveLength(1);
      expect(results[0].yearOfStudy).toBe('1');
    });
  });

  // ==================== UTILITY FUNCTIONS ====================
  describe('Utility Functions', () => {
    test('exportToJson should format timetable correctly', async () => {
      const html = createSingleGroupHtml('111');
      mockedAxios.get.mockResolvedValue({ data: html });

      const timetable = await parseTimetable(validUrl);
      const json = exportToJson(timetable);
      const parsed = JSON.parse(json);

      expect(parsed.academicYear).toBe('2024');
      expect(parsed.entries).toBeDefined();
    });

    test('exportToJson should respect pretty parameter', async () => {
      const html = createSingleGroupHtml('111');
      mockedAxios.get.mockResolvedValue({ data: html });

      const timetable = await parseTimetable(validUrl);
      const prettyJson = exportToJson(timetable, true);
      const compactJson = exportToJson(timetable, false);

      expect(prettyJson.length).toBeGreaterThan(compactJson.length);
      expect(prettyJson).toContain('\n');
      expect(compactJson).not.toContain('\n');
    });

    test('createTimetableHash should generate consistent hashes', async () => {
      const html = createSingleGroupHtml('111');
      mockedAxios.get.mockResolvedValue({ data: html });

      const timetable = await parseTimetable(validUrl);
      const hash1 = createTimetableHash(timetable);
      const hash2 = createTimetableHash(timetable);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    test('createTimetableHash should differ for different timetables', async () => {
      const html1 = createSingleGroupHtml('111');
      const html2 = createSingleGroupHtml('211');

      mockedAxios.get.mockResolvedValueOnce({ data: html1 });
      const timetable1 = await parseTimetable(validUrl);
      const hash1 = createTimetableHash(timetable1);

      mockedAxios.get.mockResolvedValueOnce({ data: html2 });
      const timetable2 = await parseTimetable('https://example.com/files/orar/2024-1/tabelar/CS2.html');
      const hash2 = createTimetableHash(timetable2);

      expect(hash1).not.toBe(hash2);
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    test('should throw error for empty page', async () => {
      const emptyHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: emptyHtml });

      await expect(parseTimetable(validUrl))
        .rejects.toThrow(/Empty timetable page.*bytes.*program may not have started yet/);
    });

    test('should throw error for page with no timetable tables', async () => {
      // Create a page larger than 1000 bytes with no valid tables
      const largeHtml = '<html><body><h1>Grupa 111</h1>' + '<p>No table here</p>'.repeat(100) + '</body></html>';
      mockedAxios.get.mockResolvedValue({ data: largeHtml });

      await expect(parseTimetable(validUrl))
        .rejects.toThrow('Could not locate any timetable tables');
    });

    test('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network timeout'));

      await expect(parseTimetable(validUrl))
        .rejects.toThrow('Network timeout');
    });
  });
});

// ==================== HELPER FUNCTIONS ====================
function createSingleGroupHtml(groupNumber: string): string {
  return `<html><body>
    <h1>Grupa ${groupNumber}</h1>
    <table>
      <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Formatia</th></tr>
      <tr><td>Luni</td><td>08:00-10:00</td><td>Test Subject</td><td>${groupNumber}/1</td></tr>
    </table>
  </body></html>`;
}

function createCompleteHtml(): string {
  return `<html><body>
    <h1>Grupa 211</h1>
    <table>
      <tr>
        <th>Ziua</th><th>Ore</th><th>Frecventa</th><th>Sala</th>
        <th>Formatia</th><th>Tip</th><th>Disciplina</th><th>Titular</th>
      </tr>
      <tr>
        <td>Luni</td><td>08:00-10:00</td><td>sapt. 1-14</td><td>309</td>
        <td>211/1</td><td>Curs</td><td>Algoritmi Paraleli</td><td>Prof. Dr. Popescu Ion</td>
      </tr>
      <tr>
        <td>Marti</td><td>10:00-12:00</td><td>sapt. 1-14</td><td>Lab 2</td>
        <td>211/2</td><td>Laborator</td><td>Baze de Date</td><td>Lect. Dr. Ionescu Maria</td>
      </tr>
    </table>
  </body></html>`;
}

function createMinimalHtml(): string {
  return `<html><body>
    <h1>Grupa 311</h1>
    <table>
      <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th></tr>
      <tr><td>Miercuri</td><td>12:00-14:00</td><td>Matematica</td></tr>
    </table>
  </body></html>`;
}

function createHtmlWithEmptyRows(): string {
  return `<html><body>
    <h1>Grupa 411</h1>
    <table>
      <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th></tr>
      <tr><td></td><td></td><td></td></tr>
      <tr><td>Joi</td><td>10:00-12:00</td><td>Fizica</td></tr>
      <tr><td></td><td></td><td></td></tr>
    </table>
  </body></html>`;
}

function createMultipleGroupsHtml(groupNumbers: string[]): string {
  const tables = groupNumbers.map(num => `
    <h1>Grupa ${num}</h1>
    <table>
      <tr><th>Ziua</th><th>Ore</th><th>Disciplina</th><th>Formatia</th></tr>
      <tr><td>Luni</td><td>08:00-10:00</td><td>Subject ${num}</td><td>${num}/1</td></tr>
      <tr><td>Marti</td><td>10:00-12:00</td><td>Subject ${num}B</td><td>${num}/2</td></tr>
    </table>
  `).join('\n');

  return `<html><body>${tables}</body></html>`;
}

function createHtmlWithTwoGroups(): string {
  return `<html><body>
    <h1>Grupa 831</h1>
    <table>
      <tr><th>Ziua</th><th>Disciplina</th><th>Formatia</th></tr>
      <tr><td>Luni</td><td>Math</td><td>831/1</td></tr>
      <tr><td>Marti</td><td>Physics</td><td>831/2</td></tr>
    </table>
    <h1>Grupa 832</h1>
    <table>
      <tr><th>Ziua</th><th>Disciplina</th><th>Formatia</th></tr>
      <tr><td>Miercuri</td><td>Chemistry</td><td>832/1</td></tr>
    </table>
  </body></html>`;
}

function createHtmlWithInvalidH1(): string {
  return `<html><body>
    <h1>Title Page</h1>
    <table><tr><th>Ziua</th></tr></table>
    <h1>Grupa 311</h1>
    <table>
      <tr><th>Ziua</th><th>Disciplina</th></tr>
      <tr><td>Luni</td><td>Subject X</td></tr>
    </table>
    <h1>Invalid Group 99</h1>
    <table><tr><th>Ziua</th></tr></table>
  </body></html>`;
}

function createHtmlWithNoGroups(): string {
  return `<html><body>
    <h1>No Groups Here</h1>
    <table><tr><th>Ziua</th></tr></table>
  </body></html>`;
}

