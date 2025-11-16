import axios from 'axios';
import { load, CheerioAPI } from 'cheerio';
import * as crypto from 'crypto';
import { Timetable, TimetableEntry } from '../types';

// --- Utilities ---
function norm(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanCell(s: string): string {
    return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

// Map common Romanian headers to fields expected by TimetableEntry
const HEADER_MAP: Record<string, keyof TimetableEntry> = {
    zi: 'day',
    ziua: 'day',
    'ziua saptamanii': 'day',

    ore: 'hours',
    ora: 'hours',
    orele: 'hours',
    'interval orar': 'hours',

    frecventa: 'frequency',
    'frecventa/se': 'frequency',
    'frecventa saptamanala': 'frequency',

    sala: 'room',
    locatie: 'room',
    'sala/lab': 'room',
    'sala/locatie': 'room',

    grup: 'group',
    grupa: 'group',
    formatie: 'group',
    formatia: 'group',
    'formatia/seria': 'group',
    serie: 'group',

    tip: 'type',
    tipul: 'type',
    forma: 'type',

    disciplina: 'subject',
    materie: 'subject',
    curs: 'subject',

    profesor: 'teacher',
    'cadre didactice': 'teacher',
    'cadrul didactic': 'teacher',
    titular: 'teacher',
    'titular curs': 'teacher',
    'titular/seminar': 'teacher',
};

// Find ALL timetable tables on the page (one per group)
function findAllTimetableTables($: CheerioAPI): Array<{ el: any; score: number; headers: string[] }> {
    const tables = $('table');
    const timetables: Array<{ el: any; score: number; headers: string[] }> = [];

    tables.each((_, tbl) => {
        const headerCells = $(tbl).find('tr').first().find('th, td');
        if (!headerCells.length) return;

        const headers = headerCells
            .map((__, h) => norm($(h).text()))
            .get()
            .filter(Boolean);

        if (headers.length < 3) return;

        const score = headers.reduce((acc, h) => (HEADER_MAP[h] ? acc + 1 : acc), 0);

        // Only consider tables with a minimum score (timetable tables)
        if (score >= 3) {
            if (process.env.DEBUG_PARSER) {
                // eslint-disable-next-line no-console
                console.log('Found timetable table with score:', score);
            }

            timetables.push({ el: tbl, score, headers });
        }
    });

    return timetables;
}

// Legacy function for backward compatibility - returns the best single table
function findTimetableTable($: CheerioAPI): { el: any; score: number; headers: string[] } | null {
    const allTables = findAllTimetableTables($);
    if (allTables.length === 0) return null;

    // Return the one with the highest score
    return allTables.reduce((best, current) =>
        current.score > best.score ? current : best
    );
}

function buildColumnMapping(headers: string[]): { [colIndex: number]: keyof TimetableEntry } {
    const mapping: { [colIndex: number]: keyof TimetableEntry } = {};
    headers.forEach((h, i) => {
        const key = HEADER_MAP[h];
        if (key) mapping[i] = key;
    });
    return mapping;
}

const URL_REGEX = /\/files\/orar\/(\d{4})-(\d)\/tabelar\/([A-Za-z0-9]+)\.html$/i;

function extractUrlMetadata(url: string) {
    const m = url.match(URL_REGEX);
    if (!m) {
        throw new Error(
            'URL does not match expected pattern {YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}.html'
        );
    }
    const [, academicYear, semester, filename] = m;

    // Extract specialization and year from filename
    // Handle patterns like: MIE3, CTI1, MaAI4CI1, etc.
    const filenameMatch = filename.match(/^([A-Za-z]+)(\d+)$/);
    let specialization, yearOfStudy;

    if (filenameMatch) {
        [, specialization, yearOfStudy] = filenameMatch;
    } else {
        // Fallback for complex names like MaAI4CI1
        specialization = filename.replace(/\d+$/, '');
        yearOfStudy = filename.match(/\d+$/)?.[0] || '1';
    }

    return { academicYear, semester, specialization, yearOfStudy };
}

export async function parseTimetable(url: string): Promise<Timetable> {
    const metadata = extractUrlMetadata(url);

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

    // Find ALL timetable tables on the page (one per group)
    const allTables = findAllTimetableTables($);

    if (allTables.length === 0) {
        // Check if page exists but is empty (common for programs not yet started)
        const pageSize = response.data.length;
        if (pageSize < 1000) {
            throw new Error(`Empty timetable page (${pageSize} bytes) - program may not have started yet`);
        }
        throw new Error('Could not locate any timetable tables on the page');
    }

    // Extract entries from ALL tables and combine them
    const allEntries: TimetableEntry[] = [];

    for (const tableInfo of allTables) {
        const $table = $(tableInfo.el);
        const rawHeaders = $table
            .find('tr')
            .first()
            .find('th, td')
            .map((_, h) => norm($(h).text()))
            .get();

        const colMap = buildColumnMapping(rawHeaders);

        $table
            .find('tr')
            .slice(1)
            .each((_, tr) => {
                const cells = $(tr).find('td');
                if (!cells.length) return; // skip spacer/header rows

                const item: Partial<TimetableEntry> = {};
                cells.each((ci, td) => {
                    const key = colMap[ci];
                    if (!key) return;
                    const text = cleanCell($(td).text());
                    if (text) item[key] = text as any;
                });

                // Skip rows with no core info
                const hasCore = !!(item.day || item.subject || item.hours);
                if (!hasCore) return;

                // Keep the group name exactly as it appears in the table
                // DO NOT modify or infer it - use what's in the group column
                if (!item.group || item.group.trim() === '') {
                    item.group = `${metadata.specialization}${metadata.yearOfStudy}`;
                }

                item.teacher = (item.teacher || '').replace(/\s*,\s*/g, ', ').trim();
                item.type = (item.type || '').replace(/\s+/g, ' ').trim();
                item.frequency = (item.frequency || '').replace(/\s+/g, ' ').trim();

                allEntries.push({
                    day: item.day || '',
                    hours: item.hours || '',
                    frequency: item.frequency || '',
                    room: item.room || '',
                    group: item.group || '',
                    type: item.type || '',
                    subject: item.subject || '',
                    teacher: item.teacher || '',
                });
            });
    }

    return { ...metadata, entries: allEntries };
}

/**
 * Parse a timetable URL and return separate timetables for each group found on the page.
 * Each <h1> heading indicates a group name (e.g., "Grupa 211"), followed by its table.
 * The "Formatia" column contains subgroup info (like 211/1, 211/2) and should be preserved as-is.
 *
 * @param url - URL to the timetable HTML page
 * @returns Array of timetables, one per group
 */
export async function parseTimetablesByGroup(url: string): Promise<Array<Timetable & { groupName: string }>> {
    const metadata = extractUrlMetadata(url);

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

    // Find all <h1> elements that contain group names
    // They typically follow pattern: "Grupa 211", "Grupa 212", etc.
    const groupTimetables: Array<Timetable & { groupName: string }> = [];

    $('h1').each((_, h1) => {
        const h1Text = $(h1).text().trim();

        // Check if this h1 contains a group identifier (any number with 2+ digits)
        const groupMatch = h1Text.match(/\b(\d{2,})\b/);
        if (!groupMatch) return; // Skip h1s that don't contain a group number

        // Use the full h1 text as the group name (e.g., "Grupa 211", "Grupa 1234")
        const groupName = h1Text;

        // Find the next table after this h1
        const $table = $(h1).nextAll('table').first();
        if (!$table.length) return; // No table found after this h1

        // Verify this is a timetable table by checking headers
        const headerCells = $table.find('tr').first().find('th, td');
        if (!headerCells.length) return;

        const headers = headerCells
            .map((__, h) => norm($(h).text()))
            .get()
            .filter(Boolean);

        const score = headers.reduce((acc, h) => (HEADER_MAP[h] ? acc + 1 : acc), 0);
        if (score < 3) return; // Not a valid timetable table

        // Parse the table
        const rawHeaders = $table
            .find('tr')
            .first()
            .find('th, td')
            .map((_, h) => norm($(h).text()))
            .get();

        const colMap = buildColumnMapping(rawHeaders);
        const entries: TimetableEntry[] = [];

        $table
            .find('tr')
            .slice(1)
            .each((_, tr) => {
                const cells = $(tr).find('td');
                if (!cells.length) return;

                const item: Partial<TimetableEntry> = {};
                cells.each((ci, td) => {
                    const key = colMap[ci];
                    if (!key) return;
                    const text = cleanCell($(td).text());
                    if (text) item[key] = text as any;
                });

                const hasCore = !!(item.day || item.subject || item.hours);
                if (!hasCore) return;

                // The "Formatia" column contains subgroup info (211/1, 211/2, I1, etc.)
                // Keep it as-is - it's NOT the group identifier
                item.teacher = (item.teacher || '').replace(/\s*,\s*/g, ', ').trim();
                item.type = (item.type || '').replace(/\s+/g, ' ').trim();
                item.frequency = (item.frequency || '').replace(/\s+/g, ' ').trim();

                entries.push({
                    day: item.day || '',
                    hours: item.hours || '',
                    frequency: item.frequency || '',
                    room: item.room || '',
                    group: item.group || '',  // This is the "Formatia" value, not the group name
                    type: item.type || '',
                    subject: item.subject || '',
                    teacher: item.teacher || '',
                });
            });

        // Only add timetables that have entries
        if (entries.length > 0) {
            groupTimetables.push({
                ...metadata,
                groupName,
                entries
            });
        }
    });

    if (groupTimetables.length === 0) {
        const pageSize = response.data.length;
        if (pageSize < 1000) {
            throw new Error(`Empty timetable page (${pageSize} bytes) - program may not have started yet`);
        }
        throw new Error('Could not locate any group timetables on the page');
    }

    return groupTimetables;
}

export async function parseMultipleTimetables(urls: string[]): Promise<Timetable[]> {
    const results = await Promise.allSettled(urls.map((u) => parseTimetable(u)));
    return results
        .filter((r): r is PromiseFulfilledResult<Timetable> => r.status === 'fulfilled')
        .map((r) => r.value);
}

export function exportToJson(timetable: Timetable, pretty: boolean = true): string {
    return JSON.stringify(timetable, null, pretty ? 2 : 0);
}

export function createTimetableHash(timetable: Timetable): string {
    const hash = crypto.createHash('sha256');
    hash.update(
        JSON.stringify({
            academicYear: timetable.academicYear,
            semester: timetable.semester,
            specialization: timetable.specialization,
            yearOfStudy: timetable.yearOfStudy,
            entries: timetable.entries,
        })
    );
    return hash.digest('hex');
}