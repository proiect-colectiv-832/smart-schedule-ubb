import fs from 'fs/promises';
import path from 'path';
import { Field } from '../entities/field';
import { Optional_subject } from '../entities/optional_subject';
import { parseSpecializations } from '../parsers/specialization-parser';
import { parseTimetable } from '../parsers/timetable-parser';
import { parseCourseList } from '../parsers/subject-list-parser';
import { parseSubjectTimetable } from '../parsers/subject-timetable-parser';
import { TimetableEntry } from '../types';

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

  result.specializations.forEach((spec: { name: string; years: { year: number; href: string }[] }) => {
    const fieldName = spec.name;
    if (!fieldMap.has(fieldName)) {
      fieldMap.set(fieldName, { years: new Set(), yearLinks: new Map() });
    }
    const fieldData = fieldMap.get(fieldName)!;
    spec.years.forEach((yearInfo: { year: number; href: string }) => {
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
  console.log('📚 Step 2: Parsing individual subject timetables...\n');

  // Fetch the course list with codes
  console.log('   Fetching subject codes from course list...');
  const subjects: Optional_subject[] = [];
  const UBB_DISC_BASE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/disc';
  
  try {
    const courseList = await parseCourseList(UBB_SUBJECTS_LIST_URL);
    console.log(`   ✅ Found ${courseList.courses.length} courses\n`);
    
    console.log('   Parsing individual subject timetables...');
    let processed = 0;
    let failed = 0;
    const batchSize = 10; // Increase batch size since these are simpler pages
    
    for (let i = 0; i < courseList.courses.length; i += batchSize) {
      const batch = courseList.courses.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (course: { code: string; name: string; href: string }) => {
          try {
            const subjectUrl = `${UBB_DISC_BASE_URL}/${course.href}`;
            const entries = await parseSubjectTimetable(subjectUrl, course.name.trim());
            
            if (entries.length > 0) {
              subjects.push(new Optional_subject({
                name: course.name.trim(),
                code: course.code.trim(),
                timetableEntries: entries
              }));
              processed++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
            // Silently skip subjects without timetables
          }
        })
      );
      
      if ((i + batchSize) % 50 === 0 || (i + batchSize) >= courseList.courses.length) {
        console.log(`   Processed: ${Math.min(i + batchSize, courseList.courses.length)}/${courseList.courses.length}`);
      }
      
      if (i + batchSize < courseList.courses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Successfully parsed: ${processed}/${courseList.courses.length} subjects`);
    if (failed > 0) console.log(`⚠️  Failed/Empty: ${failed}`);
    
  } catch (error) {
    console.error('   ❌ Failed to fetch course list:', error);
    throw error;
  }
  
  await saveSubjectsToFile(subjects);
  console.log(`📊 Subjects cached: ${subjects.length}\n`);
  
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
