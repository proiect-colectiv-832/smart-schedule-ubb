import axios from 'axios';
import { load } from 'cheerio';

export interface CourseInfo {
    code: string;   // Codul disciplinei, ex: "MME8120"
    name: string;   // Numele disciplinei, ex: "Adaptive Web Design"
    href: string;   // Link către pagina disciplinei
}

export interface CourseList {
    courses: CourseInfo[];
    totalCount: number;
}

/**
 * Curăță textul de spații și caractere non-breaking
 */
function cleanText(text: string): string {
    return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parsează pagina HTML și extrage disciplinele
 */
export async function parseCourseList(url: string): Promise<CourseList> {
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
    const courses: CourseInfo[] = [];

    $('table tr').each((_, element) => {
        const tds = $(element).find('td');
        if (tds.length !== 2) return;

        const code = cleanText($(tds[0]).text());
        const $link = $(tds[1]).find('a');
        const name = cleanText($link.text());
        const href = $link.attr('href') || '';

        if (!code || !name || !href) return;

        courses.push({ code, name, href });
    });

    return {
        courses,
        totalCount: courses.length,
    };
}

/**
 * Filtrează discipline după nume (case-insensitive)
 */
export function filterCoursesByName(courses: CourseInfo[], searchTerm: string): CourseInfo[] {
    const lowerSearch = searchTerm.toLowerCase();
    return courses.filter((c) => c.name.toLowerCase().includes(lowerSearch));
}

/**
 * Caută discipline după cod (case-insensitive)
 */
export function searchCoursesByCode(courses: CourseInfo[], searchTerm: string): CourseInfo[] {
    const lowerSearch = searchTerm.toLowerCase();
    return courses.filter((c) => c.code.toLowerCase().includes(lowerSearch));
}

/**
 * Grupează disciplinele după prima literă a numelui
 */
export function groupCoursesByNameInitial(courses: CourseInfo[]): Record<string, CourseInfo[]> {
    const grouped: Record<string, CourseInfo[]> = {};

    courses.forEach((course) => {
        const initial = course.name.charAt(0).toUpperCase();
        if (!grouped[initial]) grouped[initial] = [];
        grouped[initial].push(course);
    });

    return grouped;
}
