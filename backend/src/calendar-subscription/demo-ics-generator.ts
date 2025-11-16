/**
 * Demo Script pentru testarea generării de fișiere .ics cu calendar academic integrat
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateICalendar, invalidateAcademicCache } from './icalendar-generator';
import { UserTimetable, UserEvent } from './user-timetable-manager';

// Creăm un timetable de test pentru un student
function createTestTimetable(): UserTimetable {
  const events: UserEvent[] = [];

  // Programare Avansată pe Metode Orientate pe Obiecte (Luni 10-12, Curs, săptămânal)
  events.push({
    id: 'event-1',
    title: 'Programare Avansată pe Metode Orientate pe Obiecte',
    type: 'lecture',
    startTime: new Date('2025-10-06T10:00:00+03:00'), // Luni, 6 octombrie 2025
    endTime: new Date('2025-10-06T12:00:00+03:00'),
    location: 'Amfiteatrul I',
    description: 'Curs Prof. dr. X',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'weekly',
      daysOfWeek: [1], // Luni
    },
    color: '#2196F3'
  });

  // Baze de Date (Marți 12-14, Laborator, săptămâna 1 - odd weeks)
  events.push({
    id: 'event-2',
    title: 'Baze de Date - Laborator',
    type: 'lab',
    startTime: new Date('2025-10-07T12:00:00+03:00'), // Marți, 7 octombrie 2025
    endTime: new Date('2025-10-07T14:00:00+03:00'),
    location: 'Sala 2',
    description: 'Laborator Grupa 931/1',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'oddweeks',
      daysOfWeek: [2], // Marți
    },
    color: '#4CAF50'
  });

  // Ingineria Sistemelor Software (Miercuri 14-16, Seminar, săptămâna 2 - even weeks)
  events.push({
    id: 'event-3',
    title: 'Ingineria Sistemelor Software - Seminar',
    type: 'seminar',
    startTime: new Date('2025-10-08T14:00:00+03:00'), // Miercuri, 8 octombrie 2025
    endTime: new Date('2025-10-08T16:00:00+03:00'),
    location: 'Sala 5',
    description: 'Seminar Grupa 931',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'evenweeks',
      daysOfWeek: [3], // Miercuri
    },
    color: '#FF9800'
  });

  // Rețele de Calculatoare (Joi 8-10, Curs, săptămânal)
  events.push({
    id: 'event-4',
    title: 'Rețele de Calculatoare',
    type: 'lecture',
    startTime: new Date('2025-10-09T08:00:00+03:00'), // Joi, 9 octombrie 2025
    endTime: new Date('2025-10-09T10:00:00+03:00'),
    location: 'Amfiteatrul II',
    description: 'Curs Prof. dr. Y',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'weekly',
      daysOfWeek: [4], // Joi
    },
    color: '#9C27B0'
  });

  // Sisteme de Operare (Vineri 10-12, Laborator, săptămânal)
  events.push({
    id: 'event-5',
    title: 'Sisteme de Operare - Laborator',
    type: 'lab',
    startTime: new Date('2025-10-10T10:00:00+03:00'), // Vineri, 10 octombrie 2025
    endTime: new Date('2025-10-10T12:00:00+03:00'),
    location: 'Sala 3',
    description: 'Laborator Grupa 931/2',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'weekly',
      daysOfWeek: [5], // Vineri
    },
    color: '#F44336'
  });

  // Eveniment one-time: Prezentare proiect (fix pe 15 noiembrie 2025)
  events.push({
    id: 'event-6',
    title: 'Prezentare Proiect ISS',
    type: 'custom', // schimbat din 'assignment' în 'custom'
    startTime: new Date('2025-11-15T14:00:00+02:00'),
    endTime: new Date('2025-11-15T16:00:00+02:00'),
    location: 'Sala 7',
    description: 'Prezentare proiect final ISS',
    isRecurring: false,
    color: '#E91E63'
  });

  return {
    userId: 'test-user-123',
    events,
    semesterStart: new Date('2025-09-29'), // Început semestru I conform structurii
    semesterEnd: new Date('2026-01-18'), // Sfârșit semestru I
    lastModified: new Date().toISOString() // schimbat din lastUpdated în lastModified (string ISO)
  };
}

async function generateAndSaveICS(
  timetable: UserTimetable,
  filename: string,
  options: {
    language?: 'ro-en' | 'hu-de';
    isTerminalYear?: boolean;
    includeVacations?: boolean;
    includeExamPeriods?: boolean;
  }
) {
  console.log(`\n📝 Generating ${filename}...`);
  console.log(`   Options:`, JSON.stringify(options, null, 2));

  const icalString = await generateICalendar(timetable, 'test-user-123', options);

  // Salvăm fișierul
  const outputPath = path.join(__dirname, '..', '..', 'test-output', filename);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, icalString, 'utf8');

  // Statistici
  const eventCount = (icalString.match(/BEGIN:VEVENT/g) || []).length;
  const vacationCount = (icalString.match(/🏖️/g) || []).length;
  const examCount = (icalString.match(/📝/g) || []).length;

  console.log(`   ✅ Saved to: ${outputPath}`);
  console.log(`   📊 Stats: ${eventCount} total events`);
  console.log(`      - User events: ${timetable.events.length}`);
  console.log(`      - Vacations: ${vacationCount}`);
  console.log(`      - Exam periods: ${examCount}`);
  console.log(`   📏 File size: ${(icalString.length / 1024).toFixed(2)} KB`);
}

async function main() {
  console.log('='.repeat(80));
  console.log('🎓 UBB Smart Schedule - iCalendar Generator Demo');
  console.log('='.repeat(80));
  console.log('📅 Current date:', new Date().toLocaleDateString('ro-RO'));
  console.log('');

  // Invalidăm cache-ul pentru a face scraping fresh
  invalidateAcademicCache();

  // Creăm timetable de test
  console.log('📚 Creating test timetable...');
  const timetable = createTestTimetable();
  console.log(`   Created timetable with ${timetable.events.length} events`);
  console.log(`   Semester: ${timetable.semesterStart?.toLocaleDateString('ro-RO')} - ${timetable.semesterEnd?.toLocaleDateString('ro-RO')}`);

  console.log('\n📋 Events in timetable:');
  timetable.events.forEach((event, idx) => {
    const recurring = event.isRecurring ?
      `(${event.recurrenceRule?.frequency}, ${['Su','Mo','Tu','We','Th','Fr','Sa'][event.recurrenceRule?.daysOfWeek?.[0] || 0]})` :
      '(one-time)';
    console.log(`   ${idx + 1}. ${event.title} - ${event.type} ${recurring}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔨 Generating different .ics variants...');
  console.log('='.repeat(80));

  try {
    // 1. Calendar complet cu tot (limba română, an non-terminal)
    await generateAndSaveICS(
      timetable,
      'calendar-full-ro-nonterminal.ics',
      {
        language: 'ro-en',
        isTerminalYear: false,
        includeVacations: true,
        includeExamPeriods: true
      }
    );

    // 2. Calendar complet pentru an terminal (licență anul 3)
    await generateAndSaveICS(
      timetable,
      'calendar-full-ro-terminal.ics',
      {
        language: 'ro-en',
        isTerminalYear: true,
        includeVacations: true,
        includeExamPeriods: true
      }
    );

    // 3. Calendar limba maghiară (cu Paștile catolic)
    await generateAndSaveICS(
      timetable,
      'calendar-full-hu-nonterminal.ics',
      {
        language: 'hu-de',
        isTerminalYear: false,
        includeVacations: true,
        includeExamPeriods: true
      }
    );

    // 4. Calendar fără vacanțe (doar cursuri)
    await generateAndSaveICS(
      timetable,
      'calendar-no-vacations.ics',
      {
        language: 'ro-en',
        isTerminalYear: false,
        includeVacations: false,
        includeExamPeriods: false
      }
    );

    // 5. Calendar doar cu vacanțe (fără sesiuni examene)
    await generateAndSaveICS(
      timetable,
      'calendar-only-vacations.ics',
      {
        language: 'ro-en',
        isTerminalYear: false,
        includeVacations: true,
        includeExamPeriods: false
      }
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! All calendars generated');
    console.log('='.repeat(80));
    console.log('\n📁 Output directory: backend/test-output/');
    console.log('\n📖 Usage:');
    console.log('   1. Open any .ics file with a calendar app (Google Calendar, Apple Calendar, Outlook)');
    console.log('   2. Or import the URL into your calendar app for live updates');
    console.log('   3. Compare the different variants to see the differences');

    console.log('\n🔍 What to look for:');
    console.log('   - Recurring events (weekly courses)');
    console.log('   - Odd/even week events (biweekly labs)');
    console.log('   - 🏖️  Vacation periods (all-day events)');
    console.log('   - 📝 Exam sessions (all-day events, only in terminal year calendars)');
    console.log('   - 🎓 Graduation exam (only in terminal year calendars)');
    console.log('   - Courses should NOT appear during vacation periods');

    console.log('\n💡 Differences between calendars:');
    console.log('   - calendar-full-ro-nonterminal.ics: Romanian students, years 1-2');
    console.log('     → Longer semester II, practice period included');
    console.log('   - calendar-full-ro-terminal.ics: Romanian students, year 3');
    console.log('     → Shorter semester II, graduation exam period');
    console.log('   - calendar-full-hu-nonterminal.ics: Hungarian students');
    console.log('     → Catholic Easter (1 week earlier than Orthodox)');
    console.log('   - calendar-no-vacations.ics: Clean calendar, only courses');
    console.log('   - calendar-only-vacations.ics: Only vacation periods');

    console.log('\n🌟 Example subscription URLs (if running on server):');
    console.log('   http://localhost:3000/calendar/{token}.ics?language=ro-en&isTerminalYear=false');
    console.log('   http://localhost:3000/calendar/{token}.ics?language=ro-en&isTerminalYear=true');
    console.log('   http://localhost:3000/calendar/{token}.ics?language=hu-de&isTerminalYear=false');

  } catch (error) {
    console.error('\n❌ ERROR during generation:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
}

// Run the demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
