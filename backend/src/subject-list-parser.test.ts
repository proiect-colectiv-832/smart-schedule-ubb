import axios from 'axios';
import {
    parseCourseList,
    filterCoursesByName,
    searchCoursesByCode,
    groupCoursesByNameInitial,
    CourseInfo,
} from './subject-list-parser';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Course List Parser Tests', () => {

    // ==================== NORMAL CASES ====================

    describe('Normal Cases - Complete Course List', () => {
        const validUrl = 'https://example.com/orar/disc.html';

        const completeHtml = `
      <html>
        <body>
          <table>
            <tr>
              <th>Cod</th>
              <th>Denumire</th>
            </tr>
            <tr>
              <td>MME8120</td>
              <td><a href="adaptive-web-design.html">Adaptive Web Design</a></td>
            </tr>
            <tr>
              <td>CS1010</td>
              <td><a href="intro-to-programming.html">Introduction to Programming</a></td>
            </tr>
            <tr>
              <td>MME8121</td>
              <td><a href="web-technologies.html">Web Technologies</a></td>
            </tr>
            <tr>
              <td>CS1020</td>
              <td><a href="data-structures.html">Data Structures</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;

        beforeEach(() => {
            mockedAxios.get.mockResolvedValue({ data: completeHtml });
        });

        test('should correctly parse all courses', async () => {
            const result = await parseCourseList(validUrl);
            expect(result.totalCount).toBe(4);
            expect(result.courses).toHaveLength(4);
        });

        test('should correctly extract course codes', async () => {
            const result = await parseCourseList(validUrl);
            expect(result.courses[0].code).toBe('MME8120');
            expect(result.courses[1].code).toBe('CS1010');
        });

        test('should correctly extract course names', async () => {
            const result = await parseCourseList(validUrl);
            expect(result.courses[0].name).toBe('Adaptive Web Design');
            expect(result.courses[1].name).toBe('Introduction to Programming');
        });

        test('should correctly extract href links', async () => {
            const result = await parseCourseList(validUrl);
            expect(result.courses[0].href).toBe('adaptive-web-design.html');
            expect(result.courses[2].href).toBe('web-technologies.html');
        });
    });

    // ==================== EDGE CASES ====================

    describe('Edge Cases - Missing or Malformed Data', () => {
        const validUrl = 'https://example.com/orar/disc.html';

        test('should handle extra whitespace and non-breaking spaces', async () => {
            const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>  MME8120  </td>
                <td><a href="adaptive-web-design.html">  Adaptive&nbsp;Web&nbsp;Design  </a></td>
              </tr>
            </table>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValue({ data: html });
            const result = await parseCourseList(validUrl);
            expect(result.courses[0].code).toBe('MME8120');
            expect(result.courses[0].name).toBe('Adaptive Web Design');
        });

        test('should skip empty links or missing href', async () => {
            const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>MME8120</td>
                <td><a href="adaptive-web-design.html">Adaptive Web Design</a></td>
              </tr>
              <tr>
                <td>CS1010</td>
                <td><a></a></td>
              </tr>
              <tr>
                <td>CS1020</td>
                <td>Data Structures</td>
              </tr>
            </table>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValue({ data: html });
            const result = await parseCourseList(validUrl);
            expect(result.totalCount).toBe(1);
            expect(result.courses[0].code).toBe('MME8120');
        });

        test('should handle empty table', async () => {
            const html = `<html><body><table><tr><th>Cod</th><th>Denumire</th></tr></table></body></html>`;
            mockedAxios.get.mockResolvedValue({ data: html });
            const result = await parseCourseList(validUrl);
            expect(result.totalCount).toBe(0);
            expect(result.courses).toHaveLength(0);
        });
    });

    // ==================== UTILITY FUNCTIONS ====================

    describe('Utility Functions', () => {
        const sampleCourses: CourseInfo[] = [
            { code: 'MME8120', name: 'Adaptive Web Design', href: 'adaptive-web-design.html' },
            { code: 'CS1010', name: 'Introduction to Programming', href: 'intro-to-programming.html' },
            { code: 'MME8121', name: 'Web Technologies', href: 'web-technologies.html' },
            { code: 'CS1020', name: 'Data Structures', href: 'data-structures.html' },
        ];

        describe('filterCoursesByName', () => {
            test('should filter by partial name (case-insensitive)', () => {
                const filtered = filterCoursesByName(sampleCourses, 'web');
                expect(filtered).toHaveLength(2);
                expect(filtered[0].name).toBe('Adaptive Web Design');
                expect(filtered[1].name).toBe('Web Technologies');
            });

            test('should return empty array if no match', () => {
                const filtered = filterCoursesByName(sampleCourses, 'xyz');
                expect(filtered).toHaveLength(0);
            });
        });

        describe('searchCoursesByCode', () => {
            test('should search by partial code (case-insensitive)', () => {
                const found = searchCoursesByCode(sampleCourses, 'CS10');
                expect(found).toHaveLength(2);
                expect(found[0].code).toBe('CS1010');
            });

            test('should return empty array if no match', () => {
                const found = searchCoursesByCode(sampleCourses, 'XYZ');
                expect(found).toHaveLength(0);
            });
        });

        describe('groupCoursesByNameInitial', () => {
            test('should group courses by initial letter', () => {
                const grouped = groupCoursesByNameInitial(sampleCourses);
                expect(Object.keys(grouped)).toHaveLength(4);
                expect(grouped['A'][0].name).toBe('Adaptive Web Design');
                expect(grouped['I'][0].name).toBe('Introduction to Programming');
            });

            test('should handle empty array', () => {
                const grouped = groupCoursesByNameInitial([]);
                expect(Object.keys(grouped)).toHaveLength(0);
            });
        });
    });

    // ==================== REAL-WORLD SCENARIOS ====================

    describe('Real-world Scenarios', () => {
        const validUrl = 'https://example.com/orar/disc.html';

        test('should handle mixed content with empty cells', async () => {
            const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>MME8120</td>
                <td><a href="adaptive-web-design.html">Adaptive Web Design</a></td>
              </tr>
              <tr>
                <td>CS1010</td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td>CS1020</td>
                <td><a href="data-structures.html">Data Structures</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValue({ data: html });
            const result = await parseCourseList(validUrl);
            expect(result.totalCount).toBe(2);
        });
    });
});
