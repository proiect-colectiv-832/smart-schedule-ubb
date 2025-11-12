import axios from 'axios';
import {
  parseSpecializations,
  filterByLevel,
  searchSpecializations,
  getAllYearLinks,
  groupByLevel,
  findSpecialization,
  Specialization,
} from '../src/specialization-parser';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Specialization Parser Tests', () => {

  describe('Normal Cases - Complete Specialization List', () => {
    const validUrl = 'https://example.com/orar/index.html';

    const completeHtml = `<html><head><title>Orar studenti</title></head><body><center><table><tr><th>Studii Licenta</th><th>Anul</th><th>Anul</th><th>Anul</th></tr><tr><td>Informatica - linia de studiu romana</td><td><a href="I1.html">Anul 1</a></td><td><a href="I2.html">Anul 2</a></td><td><a href="I3.html">Anul 3</a></td></tr><tr><td>Matematica - linia de studiu romana</td><td><a href="M1.html">Anul 1</a></td><td><a href="M2.html">Anul 2</a></td><td><a href="M3.html">Anul 3</a></td></tr><tr><td>Informatica - in limba engleza</td><td><a href="IE1.html">Anul 1</a></td><td><a href="IE2.html">Anul 2</a></td><td><a href="IE3.html">Anul 3</a></td></tr></table><br><table><tr><th>Studii Master</th><th>Anul</th><th>Anul</th></tr><tr><td>Baze de date</td><td><a href="MaBD1.html">Anul 1</a></td><td><a href="MaBD2.html">Anul 2</a></td></tr><tr><td>Inginerie software - in limba engleza</td><td><a href="MaIS1.html">Anul 1</a></td><td><a href="MaIS2.html">Anul 2</a></td></tr></table></center></body></html>`;

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: completeHtml });
    });

    test('should correctly parse all specializations', async () => {
      const result = await parseSpecializations(validUrl);
      expect(result.totalCount).toBe(5);
      expect(result.specializations).toHaveLength(5);
    });

    test('should correctly identify Licenta specializations', async () => {
      const result = await parseSpecializations(validUrl);
      const licenta = result.specializations.filter(s => s.level === 'Licenta');
      expect(licenta).toHaveLength(3);
      expect(licenta[0].name).toBe('Informatica - linia de studiu romana');
    });

    test('should correctly identify Master specializations', async () => {
      const result = await parseSpecializations(validUrl);
      const master = result.specializations.filter(s => s.level === 'Master');
      expect(master).toHaveLength(2);
      expect(master[0].name).toBe('Baze de date');
    });

    test('should correctly extract year links', async () => {
      const result = await parseSpecializations(validUrl);
      const informatica = result.specializations[0];
      expect(informatica.years).toHaveLength(3);
      expect(informatica.years[0].year).toBe(1);
      expect(informatica.years[0].href).toBe('I1.html');
    });
  });

  describe('Edge Cases - Psihologie and Missing Data', () => {
    const validUrl = 'https://example.com/orar/index.html';

    test('should skip Psihologie specialization', async () => {
      const html = `<html><body><table><tr><th>Studii Licenta</th><th>Anul</th></tr><tr><td>Informatica - linia de studiu romana</td><td><a href="I1.html">Anul 1</a></td></tr><tr><td>Psihologie - Stiinte cognitive</td><td><a href="Psiho1.html">Anul 1</a></td></tr><tr><td>Matematica - linia de studiu romana</td><td><a href="M1.html">Anul 1</a></td></tr></table></body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseSpecializations(validUrl);

      expect(result.totalCount).toBe(2);
      const hasPsihologie = result.specializations.some(s => s.name.toLowerCase().includes('psihologie'));
      expect(hasPsihologie).toBe(false);
    });

    test('should handle specializations with only 2 years', async () => {
      const html = `<html><body><table><tr><th>Studii Licenta</th><th>Anul</th><th>Anul</th><th>Anul</th></tr><tr><td>Ingineria Informatiei in limba engleza</td><td><a href="II1.html">Anul 1</a></td><td><a href="II2.html">Anul 2</a></td><td>&nbsp;</td></tr></table></body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseSpecializations(validUrl);

      expect(result.specializations).toHaveLength(1);
      expect(result.specializations[0].years).toHaveLength(2);
    });

    test('should skip specializations with no year links', async () => {
      const html = `<html><body><table><tr><th>Studii Licenta</th><th>Anul</th><th>Anul</th></tr><tr><td>Informatica - linia de studiu romana</td><td><a href="I1.html">Anul 1</a></td><td><a href="I2.html">Anul 2</a></td></tr><tr><td>Specialization Without Links</td><td>&nbsp;</td><td>&nbsp;</td></tr></table></body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseSpecializations(validUrl);

      expect(result.totalCount).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    const sampleSpecializations: Specialization[] = [
      {
        name: 'Informatica - linia de studiu romana',
        level: 'Licenta',
        years: [
          { year: 1, href: 'I1.html', displayText: 'Anul 1' },
          { year: 2, href: 'I2.html', displayText: 'Anul 2' },
        ],
      },
      {
        name: 'Baze de date',
        level: 'Master',
        years: [
          { year: 1, href: 'MaBD1.html', displayText: 'Anul 1' },
        ],
      },
    ];

    describe('filterByLevel', () => {
      test('should filter Licenta specializations', () => {
        const filtered = filterByLevel(sampleSpecializations, 'Licenta');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Informatica - linia de studiu romana');
      });

      test('should filter Master specializations', () => {
        const filtered = filterByLevel(sampleSpecializations, 'Master');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Baze de date');
      });
    });

    describe('searchSpecializations', () => {
      test('should find specializations by partial name', () => {
        const found = searchSpecializations(sampleSpecializations, 'informatica');
        expect(found).toHaveLength(1);
      });

      test('should be case-insensitive', () => {
        const found = searchSpecializations(sampleSpecializations, 'BAZE');
        expect(found).toHaveLength(1);
      });
    });

    describe('getAllYearLinks', () => {
      test('should extract all unique year links', () => {
        const links = getAllYearLinks(sampleSpecializations);
        expect(links).toHaveLength(3);
        expect(links).toContain('I1.html');
        expect(links).toContain('I2.html');
        expect(links).toContain('MaBD1.html');
      });

      test('should not include duplicates', () => {
        const duplicateSpecs: Specialization[] = [
          { name: 'Spec1', level: 'Licenta', years: [{ year: 1, href: 'I1.html', displayText: 'Anul 1' }] },
          { name: 'Spec2', level: 'Licenta', years: [{ year: 1, href: 'I1.html', displayText: 'Anul 1' }] },
        ];
        const links = getAllYearLinks(duplicateSpecs);
        expect(links).toHaveLength(1);
      });
    });

    describe('groupByLevel', () => {
      test('should group specializations by level', () => {
        const grouped = groupByLevel(sampleSpecializations);
        expect(grouped.Licenta).toHaveLength(1);
        expect(grouped.Master).toHaveLength(1);
      });
    });

    describe('findSpecialization', () => {
      test('should find specialization by exact name', () => {
        const found = findSpecialization(sampleSpecializations, 'Baze de date');
        expect(found).toBeDefined();
        expect(found!.name).toBe('Baze de date');
      });

      test('should be case-insensitive', () => {
        const found = findSpecialization(sampleSpecializations, 'BAZE DE DATE');
        expect(found).toBeDefined();
      });
    });
  });

  describe('Real-world Scenarios', () => {
    test('should parse realistic full page with both Licenta and Master', async () => {
      const validUrl = 'https://example.com/orar/index.html';
      const html = `<html><body><table><tr><th>Studii Licenta</th><th>Anul</th><th>Anul</th></tr><tr><td>Informatica - linia de studiu romana</td><td><a href="I1.html">Anul 1</a></td><td><a href="I2.html">Anul 2</a></td></tr><tr><td>Psihologie - Stiinte cognitive</td><td><a href="Psiho1.html">Anul 1</a></td><td>&nbsp;</td></tr></table><br><table><tr><th>Studii Master</th><th>Anul</th><th>Anul</th></tr><tr><td>Baze de date</td><td><a href="MaBD1.html">Anul 1</a></td><td><a href="MaBD2.html">Anul 2</a></td></tr></table></body></html>`;

      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await parseSpecializations(validUrl);

      expect(result.totalCount).toBe(2);

      const licenta = filterByLevel(result.specializations, 'Licenta');
      const master = filterByLevel(result.specializations, 'Master');

      expect(licenta).toHaveLength(1);
      expect(master).toHaveLength(1);

      const hasPsihologie = result.specializations.some(s => s.name.toLowerCase().includes('psihologie'));
      expect(hasPsihologie).toBe(false);

      const allLinks = getAllYearLinks(result.specializations);
      expect(allLinks.length).toBeGreaterThan(0);
    });
  });
});

