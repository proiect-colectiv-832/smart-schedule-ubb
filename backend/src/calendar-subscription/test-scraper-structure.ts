import { scrapeAcademicCalendar } from './academic-calendar-scraper';

async function testStructure() {
  const structures = await scrapeAcademicCalendar();

  console.log('\n=== Testare Structură ===\n');

  for (const structure of structures) {
    console.log(`\nLanguage: ${structure.language}`);
    console.log(`Total semesters: ${structure.semesters.length}`);

    for (let i = 0; i < structure.semesters.length; i++) {
      const sem = structure.semesters[i];
      console.log(`  [${i}] Semester: ${sem.semester}, YearType: ${sem.yearType || 'N/A'}, Periods: ${sem.periods.length}`);
    }
  }
}

testStructure();

