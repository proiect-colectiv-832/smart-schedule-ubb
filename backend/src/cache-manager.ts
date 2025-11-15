import fs from 'fs/promises';
import path from 'path';
import { Field } from './entities/field';
import { Optional_subject } from './entities/optional_subject';
import { parseSpecializations } from './specialization-parser';
import { parseTimetable } from './timetable-parser';
import { parseCourseList } from './subject-list-parser';
import { TimetableEntry } from './types';

const UBB_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar';
const UBB_INDEX_URL = `${UBB_BASE_URL}/index.html`;
const UBB_SUBJECTS_LIST_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/disc/index.html';
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const FIELDS_CACHE_FILE = path.join(CACHE_DIR, 'fields.json');
const SUBJECTS_CACHE_FILE = path.join(CACHE_DIR, 'subjects.json');
const METADATA_CACHE_FILE = path.join(CACHE_DIR, 'metadata.json');

interface FieldCacheData {
  name: string;
  years: number[];
  yearLinks: Record<number, string>;
}

interface SubjectCacheData {
  name: string;
  code: string;
  timetableEntries: TimetableEntry[];
}

interface MetadataCache {
  lastUpdated: string;
  isInitialized: boolean;
  fieldsCount: number;
  subjectsCount: number;
}

async function ensureCacheDir(): Promise<void> {
  try {
    await fs.access(CACHE_DIR);
  } catch (err) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function saveFieldsToFile(fields: Field[]): Promise<void> {
  await ensureCacheDir();
  const fieldsData: FieldCacheData[] = fields.map(field => ({
    name: field.name,
    years: field.years,
    yearLinks: Object.fromEntries(field.yearLinks)
  }));
  await fs.writeFile(FIELDS_CACHE_FILE, JSON.stringify(fieldsData, null, 2), 'utf-8');
}

async function saveSubjectsToFile(subjects: Optional_subject[]): Promise<void> {
  await ensureCacheDir();
  const subjectsData: SubjectCacheData[] = subjects.map(subject => ({
    name: subject.name,
    code: subject.code,
    timetableEntries: subject.timetableEntries
  }));
  await fs.writeFile(SUBJECTS_CACHE_FILE, JSON.stringify(subjectsData, null, 2), 'utf-8');
}

async function saveMetadataToFile(metadata: MetadataCache): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(METADATA_CACHE_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

async function loadFieldsFromFile(): Promise<Field[]> {
  try {
    const data = await fs.readFile(FIELDS_CACHE_FILE, 'utf-8');
    const fieldsData: FieldCacheData[] = JSON.parse(data);
    return fieldsData.map(fieldData => {
      const field = new Field({
        name: fieldData.name,
        years: fieldData.years,
        yearLinks: new Map(Object.entries(fieldData.yearLinks).map(([k, v]) => [parseInt(k), v]))
      });
      return field;
    });
  } catch (err) {
    return [];
  }
}

async function loadSubjectsFromFile(): Promise<Optional_subject[]> {
  try {
    const data = await fs.readFile(SUBJECTS_CACHE_FILE, 'utf-8');
    const subjectsData: SubjectCacheData[] = JSON.parse(data);
    return subjectsData.map(subjectData => new Optional_subject({
      name: subjectData.name,
      code: subjectData.code,
      timetableEntries: subjectData.timetableEntries
    }));
  } catch (err) {
    return [];
  }
}

async function loadMetadataFromFile(): Promise<MetadataCache | null> {
  try {
    const data = await fs.readFile(METADATA_CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

async function cacheFields(): Promise<Field[]> {
  console.log('📋 Step 1: Fetching and caching fields...\n');
  const result = await parseSpecializations(UBB_INDEX_URL);
  console.log(`   Found ${result.specializations.length} specializations`);

  const fieldMap = new Map<string, { years: Set<number>, yearLinks: Map<number, string> }>();

  result.specializations.forEach(spec => {
    const fieldName = spec.name;
    if (!fieldMap.has(fieldName)) {
      fieldMap.set(fieldName, { years: new Set(), yearLinks: new Map() });
    }
    const fieldData = fieldMap.get(fieldName)!;
    spec.years.forEach(yearInfo => {
      fieldData.years.add(yearInfo.year);
      const fullUrl = `${UBB_BASE_URL}/${yearInfo.href}`;
      fieldData.yearLinks.set(yearInfo.year, fullUrl);
    });
  });

  const fields: Field[] = [];
  fieldMap.forEach((data, fieldName) => {
    const field = new Field({
      name: fieldName,
      years: Array.from(data.years).sort(),
      yearLinks: data.yearLinks
    });
    fields.push(field);
  });

  await saveFieldsToFile(fields);
  console.log(`✅ Cached ${fields.length} fields\n`);
  return fields;
}

async function cacheSubjects(fields: Field[]): Promise<Optional_subject[]> {
  console.log('📚 Step 2: Parsing timetables and caching subjects...\n');

  // First, fetch the subject codes mapping
  console.log('   Fetching subject codes from course list...');
  // Map subject names to arrays of codes (handles multiple codes per name)
  let subjectNameToCodesMap = new Map<string, string[]>();
  try {
    const courseList = await parseCourseList(UBB_SUBJECTS_LIST_URL);
    courseList.courses.forEach(course => {
      const name = course.name.trim();
      const code = course.code.trim();
      if (!subjectNameToCodesMap.has(name)) {
        subjectNameToCodesMap.set(name, []);
      }
      subjectNameToCodesMap.get(name)!.push(code);
    });
    console.log(`   ✅ Loaded ${courseList.courses.length} subject codes for ${subjectNameToCodesMap.size} unique names\n`);
  } catch (error) {
    console.warn('   ⚠️  Failed to fetch subject codes, subjects will have empty codes');
    console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  const allTimetableUrls: string[] = [];
  fields.forEach(field => {
    field.yearLinks.forEach(url => {
      allTimetableUrls.push(url);
    });
  });

  console.log(`   Total timetables to process: ${allTimetableUrls.length}`);

  let processed = 0;
  let failed = 0;
  const subjectsMap = new Map<string, Optional_subject>();
  const batchSize = 5;

  for (let i = 0; i < allTimetableUrls.length; i += batchSize) {
    const batch = allTimetableUrls.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (url) => {
        try {
          const timetable = await parseTimetable(url);
          timetable.entries.forEach((entry: TimetableEntry) => {
            const subjectName = entry.subject?.trim();
            if (!subjectName) return;

            let subject = subjectsMap.get(subjectName);
            if (!subject) {
              // Get all codes for this subject name, join them with commas if multiple
              const codes = subjectNameToCodesMap.get(subjectName) || [];
              const code = codes.length > 0 ? codes.join(',') : '';
              subject = new Optional_subject({
                name: subjectName,
                code: code,
                timetableEntries: []
              });
              subjectsMap.set(subjectName, subject);
            }
            subject.timetableEntries.push(entry);
          });
          processed++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Categorize errors for better reporting
          if (errorMessage.includes('Empty timetable page') || errorMessage.includes('No HTML tables found')) {
            console.error(`   📋 Empty: ${url.split('/').pop()}`);
          } else if (errorMessage.includes('Could not locate timetable table')) {
            console.error(`   📋 No data: ${url.split('/').pop()}`);
          } else if (errorMessage.includes('URL does not match')) {
            console.error(`   ❌ URL pattern: ${url.split('/').pop()}`);
          } else {
            console.error(`   ❌ Failed: ${errorMessage.substring(0, 60)}`);
          }
        }
      })
    );

    if ((i + batchSize) % 10 === 0 || (i + batchSize) >= allTimetableUrls.length) {
      console.log(`   Processed: ${Math.min(i + batchSize, allTimetableUrls.length)}/${allTimetableUrls.length}`);
    }

    if (i + batchSize < allTimetableUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Split subjects with multiple codes into separate entries
  const subjects: Optional_subject[] = [];
  subjectsMap.forEach((subject) => {
    if (subject.code && subject.code.includes(',')) {
      // Multiple codes - create separate subject for each code
      const codes = subject.code.split(',');
      codes.forEach(code => {
        subjects.push(new Optional_subject({
          name: subject.name,
          code: code.trim(),
          timetableEntries: [...subject.timetableEntries] // Copy entries for each code
        }));
      });
    } else {
      // Single code or no code - add as is
      subjects.push(subject);
    }
  });

  await saveSubjectsToFile(subjects);

  console.log(`\n✅ Processed: ${processed}/${allTimetableUrls.length}`);
  if (failed > 0) console.log(`⚠️  Failed: ${failed}`);
  console.log(`📊 Subjects cached: ${subjects.length} (expanded from ${subjectsMap.size} unique names)\n`);

  return subjects;
}

export async function initializeCache(): Promise<void> {
  console.log('\n🚀 Initializing Cache...\n');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const fields = await cacheFields();
    const subjects = await cacheSubjects(fields);

    const metadata: MetadataCache = {
      lastUpdated: new Date().toISOString(),
      isInitialized: true,
      fieldsCount: fields.length,
      subjectsCount: subjects.length
    };
    await saveMetadataToFile(metadata);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(60));
    console.log('✨ Cache initialized!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Fields: ${fields.length}`);
    console.log(`   Subjects: ${subjects.length}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Failed:', error);
    throw error;
  }
}

export async function getAllFields(): Promise<Field[]> {
  return await loadFieldsFromFile();
}

export async function getField(fieldName: string): Promise<Field | undefined> {
  const fields = await loadFieldsFromFile();
  return fields.find(f => f.name === fieldName);
}

export async function getAllSubjects(): Promise<Optional_subject[]> {
  return await loadSubjectsFromFile();
}

export async function getSubject(subjectName: string): Promise<Optional_subject | undefined> {
  const subjects = await loadSubjectsFromFile();
  return subjects.find(s => s.name === subjectName);
}

export async function searchSubjects(searchTerm: string): Promise<Optional_subject[]> {
  const subjects = await loadSubjectsFromFile();
  const lowerSearch = searchTerm.toLowerCase();
  return subjects.filter(subject => subject.name.toLowerCase().includes(lowerSearch));
}

export async function getCacheStats() {
  const metadata = await loadMetadataFromFile();

  if (!metadata) {
    return {
      isInitialized: false,
      lastUpdated: null,
      fieldsCount: 0,
      subjectsCount: 0,
      totalTimetableEntries: 0
    };
  }

  const subjects = await loadSubjectsFromFile();
  const totalTimetableEntries = subjects.reduce((sum, subject) => sum + subject.timetableEntries.length, 0);

  return {
    isInitialized: metadata.isInitialized,
    lastUpdated: metadata.lastUpdated,
    fieldsCount: metadata.fieldsCount,
    subjectsCount: metadata.subjectsCount,
    totalTimetableEntries
  };
}

