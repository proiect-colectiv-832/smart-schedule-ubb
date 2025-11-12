import axios from 'axios';
import {
  parseTeacherList,
  filterTeachersByTitle,
  searchTeachersByName,
  groupTeachersByTitle,
  TeacherInfo,
} from '../src/teacher-list-parser';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Teacher List Parser Tests', () => {

  // ==================== NORMAL CASES ====================

  describe('Normal Cases - Complete Teacher List', () => {
    const validUrl = 'https://example.com/orar/cadre.html';

    const completeHtml = `
      <html>
        <head>
          <title>Orar cadre didactice</title>
        </head>
        <body>
          <center>
            <table border=1 cellspacing=0 cellpadding=0>
              <tr align=center>
                <th>Cadru didactic</th>
                <th>Cadru didactic</th>
                <th>Cadru didactic</th>
              </tr>
              <tr align=center>
                <td><a href="agoc.html">Prof. AGRATINI Octavian</a></td>
                <td><a href="goan.html">Prof. ANDREICA Anca</a></td>
                <td><a href="baar.html">Prof. BARICZ Arpad</a></td>
              </tr>
              <tr align=center>
                <td><a href="ansz.html">Conf. ANDRAS Szilard</a></td>
                <td><a href="drsa.html">Conf. AVRAM Sanda</a></td>
                <td><a href="blcr.html">Conf. BLAGA Cristina</a></td>
              </tr>
              <tr align=center>
                <td><a href="alfl.html">Lect. ALBISORU Florin</a></td>
                <td><a href="anca.html">Lect. ANDOR Camelia</a></td>
                <td><a href="baio.html">Lect. BADARINZA Ioan</a></td>
              </tr>
              <tr align=center>
                <td><a href="alal.html">Asist. ALBU Alexandra</a></td>
                <td><a href="bran.html">Asist. BRICIU Anamaria</a></td>
                <td><a href="keta.html">Asist. KEPES Tamas</a></td>
              </tr>
              <tr align=center>
                <td><a href="arom.html">Drd. ARON Mihai Alexandru</a></td>
                <td><a href="bazs1.html">Drd. BAJA Zsolt</a></td>
                <td><a href="bbri.html">Drd. BALAZSI BARDOCZ Rita</a></td>
              </tr>
              <tr align=center>
                <td><a href="atra.html">C.d.asociat ATANASOV Razvan</a></td>
                <td><a href="batu.html">C.d.asociat BAL Tudor</a></td>
                <td><a href="bapa.html">C.d.asociat BARA Paul</a></td>
              </tr>
            </table>
          </center>
        </body>
      </html>
    `;

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: completeHtml });
    });

    test('should correctly parse all teacher names', async () => {
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(18);
      expect(result.teachers).toHaveLength(18);
    });

    test('should correctly extract Prof. titles', async () => {
      const result = await parseTeacherList(validUrl);

      const professors = result.teachers.filter(t => t.title === 'Prof.');
      expect(professors).toHaveLength(3);
      expect(professors[0].name).toBe('AGRATINI Octavian');
      expect(professors[1].name).toBe('ANDREICA Anca');
      expect(professors[2].name).toBe('BARICZ Arpad');
    });

    test('should correctly extract Conf. titles', async () => {
      const result = await parseTeacherList(validUrl);

      const conferenciars = result.teachers.filter(t => t.title === 'Conf.');
      expect(conferenciars).toHaveLength(3);
      expect(conferenciars[0].name).toBe('ANDRAS Szilard');
      expect(conferenciars[1].name).toBe('AVRAM Sanda');
      expect(conferenciars[2].name).toBe('BLAGA Cristina');
    });

    test('should correctly extract Lect. titles', async () => {
      const result = await parseTeacherList(validUrl);

      const lecturers = result.teachers.filter(t => t.title === 'Lect.');
      expect(lecturers).toHaveLength(3);
      expect(lecturers[0].name).toBe('ALBISORU Florin');
      expect(lecturers[1].name).toBe('ANDOR Camelia');
      expect(lecturers[2].name).toBe('BADARINZA Ioan');
    });

    test('should correctly extract Asist. titles', async () => {
      const result = await parseTeacherList(validUrl);

      const assistants = result.teachers.filter(t => t.title === 'Asist.');
      expect(assistants).toHaveLength(3);
      expect(assistants[0].name).toBe('ALBU Alexandra');
      expect(assistants[1].name).toBe('BRICIU Anamaria');
      expect(assistants[2].name).toBe('KEPES Tamas');
    });

    test('should correctly extract Drd. titles', async () => {
      const result = await parseTeacherList(validUrl);

      const phds = result.teachers.filter(t => t.title === 'Drd.');
      expect(phds).toHaveLength(3);
      expect(phds[0].name).toBe('ARON Mihai Alexandru');
      expect(phds[1].name).toBe('BAJA Zsolt');
      expect(phds[2].name).toBe('BALAZSI BARDOCZ Rita');
    });

    test('should correctly extract C.d.asociat titles', async () => {
      const result = await parseTeacherList(validUrl);

      const associates = result.teachers.filter(t => t.title === 'C.d.asociat');
      expect(associates).toHaveLength(3);
      expect(associates[0].name).toBe('ATANASOV Razvan');
      expect(associates[1].name).toBe('BAL Tudor');
      expect(associates[2].name).toBe('BARA Paul');
    });

    test('should correctly extract href links', async () => {
      const result = await parseTeacherList(validUrl);

      expect(result.teachers[0].href).toBe('agoc.html');
      expect(result.teachers[1].href).toBe('goan.html');
      expect(result.teachers[2].href).toBe('baar.html');
    });

    test('should correctly store fullName', async () => {
      const result = await parseTeacherList(validUrl);

      expect(result.teachers[0].fullName).toBe('Prof. AGRATINI Octavian');
      expect(result.teachers[3].fullName).toBe('Conf. ANDRAS Szilard');
      expect(result.teachers[6].fullName).toBe('Lect. ALBISORU Florin');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases - Missing or Malformed Data', () => {
    const validUrl = 'https://example.com/orar/cadre.html';

    test('should handle extra whitespace in names', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="test.html">  Prof.   AGRATINI   Octavian  </a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.teachers[0].fullName).toBe('Prof. AGRATINI Octavian');
      expect(result.teachers[0].name).toBe('AGRATINI Octavian');
    });

    test('should handle non-breaking spaces', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="test.html">Prof.&nbsp;AGRATINI&nbsp;Octavian</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.teachers[0].fullName).toBe('Prof. AGRATINI Octavian');
      expect(result.teachers[0].name).toBe('AGRATINI Octavian');
    });

    test('should skip empty links', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="test.html">Prof. AGRATINI Octavian</a></td>
                <td><a href=""></a></td>
                <td><a href="test2.html">Conf. ANDRAS Szilard</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(2);
      expect(result.teachers[0].name).toBe('AGRATINI Octavian');
      expect(result.teachers[1].name).toBe('ANDRAS Szilard');
    });

    test('should skip links without href attribute', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="test.html">Prof. AGRATINI Octavian</a></td>
                <td><a>Invalid Entry</a></td>
                <td><a href="test2.html">Conf. ANDRAS Szilard</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(2);
    });

    test('should handle empty table', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <th>Cadru didactic</th>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(0);
      expect(result.teachers).toHaveLength(0);
    });

    test('should handle special characters in names', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="test.html">Drd. FOLDVARI Hárold-Nimrod</a></td>
                <td><a href="test2.html">C.d.asociat LUNGANA-Niculescu Alexandru</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.teachers[0].name).toBe('FOLDVARI Hárold-Nimrod');
      expect(result.teachers[1].name).toBe('LUNGANA-Niculescu Alexandru');
    });
  });

  // ==================== UTILITY FUNCTIONS ====================

  describe('Utility Functions', () => {
    const sampleTeachers: TeacherInfo[] = [
      { name: 'AGRATINI Octavian', title: 'Prof.', href: 'agoc.html', fullName: 'Prof. AGRATINI Octavian' },
      { name: 'ANDREICA Anca', title: 'Prof.', href: 'goan.html', fullName: 'Prof. ANDREICA Anca' },
      { name: 'ANDRAS Szilard', title: 'Conf.', href: 'ansz.html', fullName: 'Conf. ANDRAS Szilard' },
      { name: 'AVRAM Sanda', title: 'Conf.', href: 'drsa.html', fullName: 'Conf. AVRAM Sanda' },
      { name: 'ALBISORU Florin', title: 'Lect.', href: 'alfl.html', fullName: 'Lect. ALBISORU Florin' },
      { name: 'ALBU Alexandra', title: 'Asist.', href: 'alal.html', fullName: 'Asist. ALBU Alexandra' },
    ];

    describe('filterTeachersByTitle', () => {
      test('should filter professors', () => {
        const filtered = filterTeachersByTitle(sampleTeachers, 'Prof.');
        expect(filtered).toHaveLength(2);
        expect(filtered[0].name).toBe('AGRATINI Octavian');
        expect(filtered[1].name).toBe('ANDREICA Anca');
      });

      test('should filter conferenciars', () => {
        const filtered = filterTeachersByTitle(sampleTeachers, 'Conf.');
        expect(filtered).toHaveLength(2);
        expect(filtered[0].name).toBe('ANDRAS Szilard');
        expect(filtered[1].name).toBe('AVRAM Sanda');
      });

      test('should return empty array for non-existent title', () => {
        const filtered = filterTeachersByTitle(sampleTeachers, 'Drd.');
        expect(filtered).toHaveLength(0);
      });
    });

    describe('searchTeachersByName', () => {
      test('should find teachers by partial name (case-insensitive)', () => {
        const found = searchTeachersByName(sampleTeachers, 'agra');
        expect(found).toHaveLength(1);
        expect(found[0].name).toBe('AGRATINI Octavian');
      });

      test('should find multiple teachers with similar names', () => {
        const found = searchTeachersByName(sampleTeachers, 'andr');
        expect(found).toHaveLength(3);
        expect(found[0].name).toBe('ANDREICA Anca');
        expect(found[1].name).toBe('ANDRAS Szilard');
        expect(found[2].name).toBe('ALBU Alexandra');
      });

      test('should find teachers by full name', () => {
        const found = searchTeachersByName(sampleTeachers, 'ALBISORU Florin');
        expect(found).toHaveLength(1);
        expect(found[0].title).toBe('Lect.');
      });

      test('should return empty array when no match', () => {
        const found = searchTeachersByName(sampleTeachers, 'XYZ');
        expect(found).toHaveLength(0);
      });
    });

    describe('groupTeachersByTitle', () => {
      test('should group teachers by their titles', () => {
        const grouped = groupTeachersByTitle(sampleTeachers);

        expect(Object.keys(grouped)).toHaveLength(4);
        expect(grouped['Prof.']).toHaveLength(2);
        expect(grouped['Conf.']).toHaveLength(2);
        expect(grouped['Lect.']).toHaveLength(1);
        expect(grouped['Asist.']).toHaveLength(1);
      });

      test('should maintain correct teacher data in groups', () => {
        const grouped = groupTeachersByTitle(sampleTeachers);

        expect(grouped['Prof.'][0].name).toBe('AGRATINI Octavian');
        expect(grouped['Prof.'][1].name).toBe('ANDREICA Anca');
      });

      test('should handle empty array', () => {
        const grouped = groupTeachersByTitle([]);
        expect(Object.keys(grouped)).toHaveLength(0);
      });
    });
  });

  // ==================== REAL-WORLD SCENARIOS ====================

  describe('Real-world Scenarios', () => {
    const validUrl = 'https://example.com/orar/cadre.html';

    test('should handle mixed content with empty cells', async () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td><a href="agoc.html">Prof. AGRATINI Octavian</a></td>
                <td><a href="goan.html">Prof. ANDREICA Anca</a></td>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><a href="ansz.html">Conf. ANDRAS Szilard</a></td>
                <td>&nbsp;</td>
                <td><a href="alfl.html">Lect. ALBISORU Florin</a></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(4);
    });

    test('should parse full realistic page structure', async () => {
      const html = `
        <html>
          <head>
            <title>Orar cadre didactice</title>
            <link href='../style.css' rel='stylesheet' type='text/css'>
            <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=ISO-8859-2">
          </head>
          <body>
            <center>
              <table border=1 cellspacing=0 cellpadding=0>
                <tr align=center>
                  <th>Cadru didactic</th>
                  <th>Cadru didactic</th>
                  <th>Cadru didactic</th>
                  <th>Cadru didactic</th>
                </tr>
                <tr align=center>
                  <td><a href="agoc.html">Prof. AGRATINI Octavian</a></td>
                  <td><a href="goan.html">Prof. ANDREICA Anca</a></td>
                  <td><a href="baar.html">Prof. BARICZ Arpad</a></td>
                  <td><a href="brsi.html">Prof. BREAZ Simion</a></td>
                </tr>
                <tr align=center>
                  <td><a href="chca1.html">Prof. CHIRA Camelia</a></td>
                  <td><a href="crse.html">Prof. CRIVEI Septimiu</a></td>
                  <td><a href="csle.html">Prof. CSATO Lehel</a></td>
                  <td><a href="sega.html">Prof. CZIBULA Gabriela</a></td>
                </tr>
              </table>
            </center>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseTeacherList(validUrl);

      expect(result.totalCount).toBe(8);
      expect(result.teachers[0].fullName).toBe('Prof. AGRATINI Octavian');
      expect(result.teachers[7].fullName).toBe('Prof. CZIBULA Gabriela');
    });
  });
});

