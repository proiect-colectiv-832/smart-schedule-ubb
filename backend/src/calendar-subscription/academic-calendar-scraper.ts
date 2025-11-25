import axios from 'axios';
import * as cheerio from 'cheerio';
import { AnyNode } from 'domhandler';

export interface AcademicPeriod {
  startDate: Date;
  endDate: Date;
  type: 'teaching' | 'vacation' | 'exams' | 'retakes' | 'practice' | 'preparation' | 'graduation' | 'free-day';
  description: string;
  notes?: string;
}

export interface SemesterStructure {
  semester: 'I' | 'II';
  yearType?: 'terminal' | 'non-terminal'; // doar pentru semestrul II
  periods: AcademicPeriod[];
}

export interface AcademicYearStructure {
  academicYear: string;
  language: 'ro-en' | 'hu-de';
  semesters: SemesterStructure[];
  lastScraped: Date;
}

/**
 * Parsează un string de date în format "DD.MM.YYYY - DD.MM.YYYY" sau "DD.MM.YYYY – DD.MM.YYYY"
 */
function parseDateRange(dateStr: string): { startDate: Date; endDate: Date } | null {
  // Normalizăm diferitele tipuri de liniuțe (-, –, —)
  const normalized = dateStr.replace(/[–—]/g, '-').trim();

  // Pattern: DD.MM.YYYY - DD.MM.YYYY
  const match = normalized.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/);

  if (!match) {
    return null;
  }

  const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = match;

  const startDate = new Date(
    parseInt(startYear),
    parseInt(startMonth) - 1, // lunile sunt 0-indexed în JS
    parseInt(startDay)
  );

  const endDate = new Date(
    parseInt(endYear),
    parseInt(endMonth) - 1,
    parseInt(endDay)
  );

  return { startDate, endDate };
}

/**
 * Determină tipul perioadei pe baza descrierii
 */
function determinePeriodType(description: string): AcademicPeriod['type'] {
  const lowerDesc = description.toLowerCase();

  // Verificăm mai întâi zilele libere (sărbători naționale)
  if (lowerDesc.includes('zi liberă') ||
      lowerDesc.includes('zi nelucrătoare') ||
      lowerDesc.includes('sărbătoare') ||
      lowerDesc.includes('free day') ||
      lowerDesc.includes('holiday')) {
    return 'free-day';
  } else if (lowerDesc.includes('activitate didactică') || lowerDesc.includes('pregătirea anului')) {
    return 'teaching';
  } else if (lowerDesc.includes('vacanț')) {
    return 'vacation';
  } else if (lowerDesc.includes('sesiune de examene')) {
    return 'exams';
  } else if (lowerDesc.includes('restanț')) {
    return 'retakes';
  } else if (lowerDesc.includes('practică')) {
    return 'practice';
  } else if (lowerDesc.includes('pregătirea examenului')) {
    return 'preparation';
  } else if (lowerDesc.includes('examen de licență') || lowerDesc.includes('disertație')) {
    return 'graduation';
  }

  return 'teaching'; // default
}

/**
 * Extrage anul academic din titlul paginii (ex: "2025-2026")
 */
function extractAcademicYear($: cheerio.CheerioAPI): string {
  const title = $('h2.title').text();
  const match = title.match(/(\d{4})-(\d{4})/);
  return match ? `${match[1]}-${match[2]}` : 'Unknown';
}

/**
 * Extrage zilele libere menționate în paranteze din descrierea unei perioade
 * Ex: "7 săptămâni (luni, 01.12.2025, Ziua Marii Uniri - zi liberă)"
 * Returnează un array de zile libere cu datele și descrierile lor
 */
function extractFreeDaysFromDescription(
  description: string,
  notes: string | undefined,
  periodStartDate: Date,
  periodEndDate: Date
): AcademicPeriod[] {
  const freeDays: AcademicPeriod[] = [];

  // Combinăm description și notes pentru a căuta zile libere
  const fullText = `${description} ${notes || ''}`;

  // Verificăm dacă textul conține "zi liberă" sau "zile libere"
  if (!/[–\-]\s*zil?e?\s+liber[ăe]/i.test(fullText)) {
    return freeDays;
  }

  // Găsim partea cu zilele libere (după paranteza deschisă, până la paranteza închisă sau end)
  const freeDaysMatch = fullText.match(/\(([^)]+[–\-]\s*zil?e?\s+liber[ăe])/i);
  if (!freeDaysMatch) {
    return freeDays;
  }

  const freeDaysText = freeDaysMatch[1];

  // Pattern pentru a găsi fiecare zi liberă: dată + descriere
  // Ex: "luni, 01.12.2025, Ziua Marii Uniri"
  const dayPattern = /(luni|marți|miercuri|joi|vineri|sâmbătă|duminică),?\s+(\d{2}\.\d{2}\.\d{4}),\s+([^,]+?)(?=\s+(?:și|–|\-|$))/gi;

  let match;
  while ((match = dayPattern.exec(freeDaysText)) !== null) {
    const dateStr = match[2];
    let freeDayDescription = match[3].trim();

    // Parsăm data
    const dateParts = dateStr.split('.');
    if (dateParts.length === 3 && freeDayDescription && freeDayDescription.length > 2) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // lunile sunt 0-indexed
      const year = parseInt(dateParts[2]);

      const freeDayDate = new Date(year, month, day);

      // Verificăm că data este în intervalul perioadei
      if (freeDayDate >= periodStartDate && freeDayDate <= periodEndDate) {
        freeDays.push({
          startDate: freeDayDate,
          endDate: freeDayDate,
          type: 'free-day',
          description: freeDayDescription,
          notes: 'Zi liberă națională'
        });
      }
    }
  }

  return freeDays;
}

/**
 * Parsează o tabelă și extrage structura semestrului/semestrelor
 */
function parseTable($: cheerio.CheerioAPI, table: AnyNode): SemesterStructure[] {
  const semesters: SemesterStructure[] = [];
  let currentSemester: SemesterStructure | null = null;

  $(table).find('tr').each((_, row) => {
    const $row = $(row);

    // Verificăm dacă este un header de semestru
    const header = $row.find('th').text().trim();

    if (header.includes('SEMESTRUL')) {
      // Verificăm mai întâi dacă este Semestrul II (trebuie să verificăm înainte de Semestrul I)
      if (header.includes('SEMESTRUL II')) {
        if (header.includes('neterminali')) {
          currentSemester = {
            semester: 'II',
            yearType: 'non-terminal',
            periods: []
          };
          semesters.push(currentSemester);
        } else if (header.includes('terminali')) {
          currentSemester = {
            semester: 'II',
            yearType: 'terminal',
            periods: []
          };
          semesters.push(currentSemester);
        }
      } else if (header.includes('SEMESTRUL I')) {
        // Semestrul I nu are diferențiere terminal/non-terminal
        currentSemester = {
          semester: 'I',
          periods: []
        };
        semesters.push(currentSemester);
      }
    } else {
      // Este un rând de date
      const cells = $row.find('td');

      if (cells.length >= 2 && currentSemester) {
        const dateStr = $(cells[0]).text().trim();
        const description = $(cells[1]).text().trim();
        const notes = cells.length >= 3 ? $(cells[2]).text().trim() : undefined;

        const dateRange = parseDateRange(dateStr);

        if (dateRange) {
          const period: AcademicPeriod = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            type: determinePeriodType(description),
            description,
            notes
          };

          currentSemester.periods.push(period);

          // Extragem zilele libere din descriere (menționate în paranteze)
          const freeDays = extractFreeDaysFromDescription(
            description,
            notes,
            dateRange.startDate,
            dateRange.endDate
          );

          // Adăugăm zilele libere ca perioade separate
          for (const freeDay of freeDays) {
            currentSemester.periods.push(freeDay);
          }
        }
      }
    }
  });

  return semesters;
}

/**
 * Scrape-ul principal care extrage structura academică de pe pagina UBB
 */
export async function scrapeAcademicCalendar(url: string = 'https://www.cs.ubbcluj.ro/invatamant/structura-anului-universitar/'): Promise<AcademicYearStructure[]> {
  try {
    console.log('Fetching academic calendar from:', url);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const academicYear = extractAcademicYear($);

    const results: AcademicYearStructure[] = [];

    // Găsim ambele secțiuni (română/engleză și maghiară/germană)
    const headers = $('h1');

    headers.each((index, header) => {
      const headerText = $(header).text().trim();
      let language: 'ro-en' | 'hu-de';

      if (headerText.includes('română') && headerText.includes('engleză')) {
        language = 'ro-en';
      } else if (headerText.includes('maghiară') && headerText.includes('germană')) {
        language = 'hu-de';
      } else {
        return; // skip
      }

      // Găsim tabelul care urmează acest header
      const table = $(header).next('table');

      if (table.length > 0) {
        const semesters = parseTable($, table[0]);

        results.push({
          academicYear,
          language,
          semesters,
          lastScraped: new Date()
        });
      }
    });

    console.log(`Successfully scraped academic calendar for ${academicYear}`);
    console.log(`Found ${results.length} language variants`);

    return results;

  } catch (error) {
    console.error('Error scraping academic calendar:', error);
    throw error;
  }
}

/**
 * Obține toate vacanțele dintr-o structură academică
 */
export function getVacations(structure: AcademicYearStructure): AcademicPeriod[] {
  const vacations: AcademicPeriod[] = [];

  for (const semester of structure.semesters) {
    for (const period of semester.periods) {
      if (period.type === 'vacation') {
        vacations.push(period);
      }
    }
  }

  return vacations;
}

/**
 * Obține toate zilele libere dintr-o structură academică
 */
export function getFreeDays(structure: AcademicYearStructure): AcademicPeriod[] {
  const freeDays: AcademicPeriod[] = [];

  for (const semester of structure.semesters) {
    for (const period of semester.periods) {
      if (period.type === 'free-day') {
        freeDays.push(period);
      }
    }
  }

  return freeDays;
}

/**
 * Verifică dacă o dată este într-o perioadă de vacanță
 */
export function isVacation(date: Date, structure: AcademicYearStructure): boolean {
  const vacations = getVacations(structure);

  return vacations.some(vacation =>
    date >= vacation.startDate && date <= vacation.endDate
  );
}

/**
 * Verifică dacă o dată este zi liberă
 */
export function isFreeDay(date: Date, structure: AcademicYearStructure): boolean {
  const freeDays = getFreeDays(structure);

  // Pentru comparație, normalizăm data la miezul nopții
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return freeDays.some(freeDay => {
    const freeDayStart = new Date(freeDay.startDate.getFullYear(), freeDay.startDate.getMonth(), freeDay.startDate.getDate());
    const freeDayEnd = new Date(freeDay.endDate.getFullYear(), freeDay.endDate.getMonth(), freeDay.endDate.getDate());
    return dateOnly >= freeDayStart && dateOnly <= freeDayEnd;
  });
}

/**
 * Verifică dacă o dată este vacanță SAU zi liberă (nu se țin cursuri)
 */
export function isNonTeachingDay(date: Date, structure: AcademicYearStructure): boolean {
  return isVacation(date, structure) || isFreeDay(date, structure);
}

/**
 * Obține perioada curentă pentru o dată dată și un tip de an (terminal/non-terminal)
 */
export function getCurrentPeriod(
  date: Date,
  structure: AcademicYearStructure,
  isTerminalYear: boolean = false
): AcademicPeriod | null {
  for (const semester of structure.semesters) {
    // Pentru semestrul II, verificăm tipul de an
    if (semester.semester === 'II' && semester.yearType) {
      if (isTerminalYear && semester.yearType !== 'terminal') {
        continue;
      }
      if (!isTerminalYear && semester.yearType !== 'non-terminal') {
        continue;
      }
    }

    for (const period of semester.periods) {
      if (date >= period.startDate && date <= period.endDate) {
        return period;
      }
    }
  }

  return null;
}
