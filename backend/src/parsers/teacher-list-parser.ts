import axios from 'axios';
import { load } from 'cheerio';

export interface TeacherInfo {
  name: string;
  title: string; // Prof., Conf., Lect., Asist., Drd., C.d.asociat
  href: string;
  fullName: string; // e.g., "Prof. AGRATINI Octavian"
}

export interface TeacherList {
  teachers: TeacherInfo[];
  totalCount: number;
}

/**
 * Extracts teacher title from full name
 * @param fullName - e.g., "Prof. AGRATINI Octavian"
 * @returns title - e.g., "Prof."
 */
function extractTitle(fullName: string): string {
  const titleMatch = fullName.match(/^(Prof\.|Conf\.|Lect\.|Asist\.|Drd\.|C\.d\.asociat)\s+/);
  return titleMatch ? titleMatch[1] : '';
}

/**
 * Extracts teacher name without title
 * @param fullName - e.g., "Prof. AGRATINI Octavian"
 * @returns name - e.g., "AGRATINI Octavian"
 */
function extractName(fullName: string): string {
  return fullName.replace(/^(Prof\.|Conf\.|Lect\.|Asist\.|Drd\.|C\.d\.asociat)\s+/, '').trim();
}

/**
 * Cleans text by removing extra whitespace and non-breaking spaces
 */
function cleanText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parses the teaching staff HTML page and extracts all teacher information
 * @param url - URL to the cadre didactice page
 * @returns TeacherList containing all teachers
 */
export async function parseTeacherList(url: string): Promise<TeacherList> {
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
  const teachers: TeacherInfo[] = [];

  // Find all links (a tags) within table cells
  $('table tr td a').each((_, element) => {
    const $link = $(element);
    const fullName = cleanText($link.text());
    const href = $link.attr('href') || '';

    // Skip empty or invalid entries
    if (!fullName || !href) return;

    const title = extractTitle(fullName);
    const name = extractName(fullName);

    teachers.push({
      name,
      title,
      href,
      fullName,
    });
  });

  return {
    teachers,
    totalCount: teachers.length,
  };
}

/**
 * Filters teachers by title
 * @param teachers - Array of teacher info
 * @param title - Title to filter by (Prof., Conf., Lect., etc.)
 */
export function filterTeachersByTitle(teachers: TeacherInfo[], title: string): TeacherInfo[] {
  return teachers.filter((t) => t.title === title);
}

/**
 * Searches teachers by name (case-insensitive)
 * @param teachers - Array of teacher info
 * @param searchTerm - Name to search for
 */
export function searchTeachersByName(teachers: TeacherInfo[], searchTerm: string): TeacherInfo[] {
  const lowerSearch = searchTerm.toLowerCase();
  return teachers.filter((t) => t.name.toLowerCase().includes(lowerSearch));
}

/**
 * Groups teachers by title
 */
export function groupTeachersByTitle(teachers: TeacherInfo[]): Record<string, TeacherInfo[]> {
  const grouped: Record<string, TeacherInfo[]> = {};

  teachers.forEach((teacher) => {
    if (!grouped[teacher.title]) {
      grouped[teacher.title] = [];
    }
    grouped[teacher.title].push(teacher);
  });

  return grouped;
}

