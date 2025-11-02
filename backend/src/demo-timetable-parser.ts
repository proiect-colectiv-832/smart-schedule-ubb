/**
 * Demo script to test the timetable parser with real data from UBB website
 * Real timetable: MIE3 (Matematica Informatica - English, Year 3)
 *
 * Usage:
 *   npx ts-node src/demo-timetable-parser.ts
 */

import { parseTimetable, exportToJson, createTimetableHash } from './timetable-parser';

const UBB_TIMETABLE_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html';

async function main() {
  try {
    console.log('🚀 Fetching timetable from UBB website...');
    console.log(`📅 Program: Matematica Informatica - English, Year 3 (MIE3)`);
    console.log(`🔗 URL: ${UBB_TIMETABLE_URL}\n`);

    // Parse the timetable from the real website
    const timetable = await parseTimetable(UBB_TIMETABLE_URL);

    console.log('✅ Successfully parsed timetable!');
    console.log(`📊 Total courses/entries: ${timetable.entries.length}\n`);

    // Display metadata
    console.log('📋 Timetable Metadata:');
    console.log(`   Academic Year: ${timetable.academicYear}`);
    console.log(`   Semester: ${timetable.semester}`);
    console.log(`   Specialization: ${timetable.specialization}`);
    console.log(`   Year of Study: ${timetable.yearOfStudy}\n`);

    // Group entries by day
    const byDay: Record<string, typeof timetable.entries> = {};
    timetable.entries.forEach(entry => {
      if (!byDay[entry.day]) {
        byDay[entry.day] = [];
      }
      byDay[entry.day].push(entry);
    });

    // Display schedule by day
    console.log('📅 Weekly Schedule:\n');
    const days = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    days.forEach(day => {
      if (byDay[day] && byDay[day].length > 0) {
        console.log(`\n📌 ${day.toUpperCase()}`);
        console.log('─'.repeat(80));

        byDay[day].forEach((entry, index) => {
          console.log(`\n${index + 1}. ${entry.subject}`);
          console.log(`   ⏰ Time: ${entry.hours}`);
          console.log(`   📖 Type: ${entry.type}`);
          console.log(`   🏫 Room: ${entry.room}`);
          console.log(`   👨‍🏫 Teacher: ${entry.teacher}`);
          console.log(`   👥 Group: ${entry.group}`);
          if (entry.frequency) {
            console.log(`   📆 Frequency: ${entry.frequency}`);
          }
        });
      }
    });

    // Show unique subjects
    const uniqueSubjects = [...new Set(timetable.entries.map(e => e.subject))];
    console.log('\n\n📚 All Subjects:');
    uniqueSubjects.forEach((subject, index) => {
      console.log(`   ${index + 1}. ${subject}`);
    });

    // Show unique teachers
    const uniqueTeachers = [...new Set(timetable.entries.map(e => e.teacher).filter(Boolean))];
    console.log('\n\n👨‍🏫 All Teachers:');
    uniqueTeachers.forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher}`);
    });

    // Show course types
    const courseTypes = [...new Set(timetable.entries.map(e => e.type).filter(Boolean))];
    console.log('\n\n📖 Course Types:');
    courseTypes.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type}`);
    });

    // Statistics
    console.log('\n\n📈 Statistics:');
    console.log(`   Total entries: ${timetable.entries.length}`);
    console.log(`   Unique subjects: ${uniqueSubjects.length}`);
    console.log(`   Unique teachers: ${uniqueTeachers.length}`);
    console.log(`   Course types: ${courseTypes.length}`);
    console.log(`   Days with classes: ${Object.keys(byDay).length}`);

    // Generate hash
    const hash = createTimetableHash(timetable);
    console.log(`\n🔐 Timetable Hash: ${hash.substring(0, 16)}...`);

    // Export to JSON
    const json = exportToJson(timetable, true);
    console.log(`\n💾 JSON Export (first 500 chars):`);
    console.log(json.substring(0, 500) + '...\n');

    console.log('✨ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error parsing timetable:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the demo
main();

