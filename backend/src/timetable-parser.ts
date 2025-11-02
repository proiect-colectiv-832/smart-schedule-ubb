import axios from 'axios';
import { load, CheerioAPI } from 'cheerio';
import crypto from 'crypto';
import { Timetable, TimetableEntry } from './types';

// --- Utilities ---
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
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

function findTimetableTable($: CheerioAPI): { el: any; score: number; headers: string[] } | null {
  const tables = $('table');
  let best: { el: any; score: number; headers: string[] } | null = null;

  tables.each((_, tbl) => {
    const headerCells = $(tbl).find('tr').first().find('th, td');
    if (!headerCells.length) return;

    const headers = headerCells
      .map((__, h) => norm($(h).text()))
      .get()
      .filter(Boolean);

    if (headers.length < 3) return;

    const score = headers.reduce((acc, h) => (HEADER_MAP[h] ? acc + 1 : acc), 0);

    if (process.env.DEBUG_PARSER) {
      // eslint-disable-next-line no-console
      console.log('Detected headers:', headers, 'score=', score);
    }

    if (!best || score > best.score) {
      best = { el: tbl, score, headers };
    }
  });

  return best;
}

function buildColumnMapping(headers: string[]): { [colIndex: number]: keyof TimetableEntry } {
  const mapping: { [colIndex: number]: keyof TimetableEntry } = {};
  headers.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key) mapping[i] = key;
  });
  return mapping;
}

const URL_REGEX = /\/files\/orar\/(\d{4})-(\d)\/tabelar\/([A-Za-z]+)(\d+)\.html$/i;

function extractUrlMetadata(url: string) {
  const m = url.match(URL_REGEX);
  if (!m) {
    throw new Error(
      'URL does not match expected pattern {YEAR}-{SEMESTER}/tabelar/{SPECIALIZATION}{YEAR}.html'
    );
  }
  const [, academicYear, semester, specialization, yearOfStudy] = m;
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

  const candidate = findTimetableTable($);
  if (!candidate || candidate.score < 3) {
    throw new Error(
      'Could not locate timetable table. Headers detected: ' + (candidate?.headers.join(', ') || 'none')
    );
  }

  const $table = $(candidate.el);
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

      if (!item.group) item.group = `${metadata.specialization}${metadata.yearOfStudy}`;
      item.teacher = (item.teacher || '').replace(/\s*,\s*/g, ', ').trim();
      item.type = (item.type || '').replace(/\s+/g, ' ').trim();
      item.frequency = (item.frequency || '').replace(/\s+/g, ' ').trim();

      entries.push({
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

  return { ...metadata, entries };
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
