import axios from 'axios';
import { load } from 'cheerio';

export type StudyLevel = 'Licenta' | 'Master';

export interface YearSchedule {
  year: number;
  href: string;
  displayText: string; // "Anul 1", "Anul 2", etc.
}

export interface Specialization {
  name: string;
  level: StudyLevel;
  years: YearSchedule[];
}

export interface SpecializationList {
  specializations: Specialization[];
  totalCount: number;
}

/**
 * Cleans text by removing extra whitespace and non-breaking spaces
 */
function cleanText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts year number from text like "Anul 1" or "Anul 2"
 * @param text - Text containing year information
 * @returns Year number (1, 2, 3, etc.) or 0 if not found
 */
function extractYearNumber(text: string): number {
  const match = text.match(/Anul\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parses the specializations page and extracts all specializations with their year links
 * @param url - URL to the specializations page
 * @returns SpecializationList containing all specializations
 */
export async function parseSpecializations(url: string): Promise<SpecializationList> {
  const response = await axios.get<string>(url, {
    responseType: 'text',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    transformResponse: (d) => d,
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const $ = load(response.data);
  const specializations: Specialization[] = [];

  // Find all tables - first table is Licenta, second is Master
  const tables = $('table');

  tables.each((tableIndex, table) => {
    // Determine study level based on table header
    const headerText = $(table).find('th').first().text();
    let level: StudyLevel;

    if (headerText.includes('Licenta')) {
      level = 'Licenta';
    } else if (headerText.includes('Master')) {
      level = 'Master';
    } else {
      return; // Skip tables that don't match
    }

    // Process each row (skip header row)
    $(table)
      .find('tr')
      .slice(1)
      .each((_, row) => {
        const cells = $(row).find('td');
        if (!cells.length) return;

        // First cell contains the specialization name
        const nameCell = cells.first();
        const name = cleanText(nameCell.text());

        // Skip empty names or "Psihologie" specialization
        if (!name || name.toLowerCase().includes('psihologie')) return;

        // Rest of the cells contain year links
        const years: YearSchedule[] = [];

        cells.slice(1).each((yearIndex, cell) => {
          const link = $(cell).find('a');
          if (link.length) {
            const href = link.attr('href') || '';
            const displayText = cleanText(link.text());
            const yearNumber = extractYearNumber(displayText);

            if (href && yearNumber > 0) {
              years.push({
                year: yearNumber,
                href,
                displayText,
              });
            }
          }
        });

        // Only add specialization if it has at least one year
        if (years.length > 0) {
          specializations.push({
            name,
            level,
            years,
          });
        }
      });
  });

  return {
    specializations,
    totalCount: specializations.length,
  };
}

/**
 * Filters specializations by study level
 */
export function filterByLevel(
  specializations: Specialization[],
  level: StudyLevel
): Specialization[] {
  return specializations.filter((s) => s.level === level);
}

/**
 * Searches specializations by name (case-insensitive)
 */
export function searchSpecializations(
  specializations: Specialization[],
  searchTerm: string
): Specialization[] {
  const lowerSearch = searchTerm.toLowerCase();
  return specializations.filter((s) => s.name.toLowerCase().includes(lowerSearch));
}

/**
 * Gets all unique year links across all specializations
 * Useful for caching all schedule pages
 */
export function getAllYearLinks(specializations: Specialization[]): string[] {
  const links = new Set<string>();
  specializations.forEach((spec) => {
    spec.years.forEach((year) => {
      if (year.href) {
        links.add(year.href);
      }
    });
  });
  return Array.from(links);
}

/**
 * Groups specializations by study level
 */
export function groupByLevel(specializations: Specialization[]): Record<StudyLevel, Specialization[]> {
  const grouped: Record<StudyLevel, Specialization[]> = {
    Licenta: [],
    Master: [],
  };

  specializations.forEach((spec) => {
    grouped[spec.level].push(spec);
  });

  return grouped;
}

/**
 * Finds a specific specialization by exact name
 */
export function findSpecialization(
  specializations: Specialization[],
  name: string
): Specialization | undefined {
  return specializations.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

