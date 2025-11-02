/**
 * Demo script to test the new Field and Subject caching system
 *
 * Usage:
 *   npx ts-node src/demo-new-cache.ts
 */

import {
  initializeCache,
  getAllFields,
  getField,
  getAllSubjects,
  searchSubjects,
  getCacheStats
} from './cache-manager';

async function main() {
  console.log('🧪 Testing New Cache System (Fields + Subjects with JSON Files)\n');

  try {
    // Step 1: Initialize cache
    console.log('1️⃣ Initializing cache...\n');
    await initializeCache();

    // Step 2: Get cache stats
    console.log('\n2️⃣ Cache Statistics:\n');
    const stats = await getCacheStats();
    console.log(`   ✅ Initialized: ${stats.isInitialized}`);
    console.log(`   📅 Last updated: ${stats.lastUpdated}`);
    console.log(`   📚 Fields cached: ${stats.fieldsCount}`);
    console.log(`   📖 Subjects cached: ${stats.subjectsCount}`);
    console.log(`   📝 Total timetable entries: ${stats.totalTimetableEntries}\n`);

    // Step 3: Show sample fields
    console.log('3️⃣ Sample Fields (first 5):\n');
    const fields = await getAllFields();
    fields.slice(0, 5).forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.name}`);
      console.log(`      Years: ${field.years.join(', ')}`);
      console.log(`      Year links:`);
      field.yearLinks.forEach((url, year) => {
        console.log(`         Year ${year}: ${url}`);
      });
      console.log('');
    });

    // Step 4: Get specific field
    console.log('4️⃣ Getting specific field (Informatica - linia de studiu romana):\n');
    const informatica = await getField('Informatica - linia de studiu romana');
    if (informatica) {
      console.log(`   ✅ Found field: ${informatica.name}`);
      console.log(`   Years: ${informatica.years.join(', ')}`);
      console.log(`   Year 3 URL: ${informatica.getYearLink(3)}\n`);
    } else {
      console.log('   ❌ Field not found\n');
    }

    // Step 5: Show sample subjects
    console.log('5️⃣ Sample Subjects (first 10):\n');
    const subjects = await getAllSubjects();
    subjects.slice(0, 10).forEach((subject, index) => {
      console.log(`   ${index + 1}. ${subject.name}`);
      console.log(`      Timetable entries: ${subject.timetableEntries.length}`);
    });
    console.log('');

    // Step 6: Search for subjects
    console.log('6️⃣ Searching for subjects containing "Programare":\n');
    const pooSubjects = await searchSubjects('Programare');
    if (pooSubjects.length > 0) {
      console.log(`   ✅ Found ${pooSubjects.length} subjects matching "Programare":`);
      pooSubjects.slice(0, 3).forEach((subject, index) => {
        console.log(`   ${index + 1}. ${subject.name} (${subject.timetableEntries.length} entries)`);
      });
      console.log('');

      // Show details of first subject
      if (pooSubjects[0].timetableEntries.length > 0) {
        console.log(`   Sample entry from "${pooSubjects[0].name}":`);
        const entry = pooSubjects[0].timetableEntries[0];
        console.log(`      Day: ${entry.day}`);
        console.log(`      Hours: ${entry.hours}`);
        console.log(`      Room: ${entry.room}`);
        console.log(`      Teacher: ${entry.teacher}`);
        console.log(`      Type: ${entry.type}`);
        console.log(`      Group: ${entry.group}`);
        console.log('');
      }
    } else {
      console.log('   ❌ No subjects found\n');
    }

    // Step 7: Search subjects
    console.log('7️⃣ Searching for subjects containing "Analiza":\n');
    const analizaSubjects = await searchSubjects('Analiza');
    console.log(`   ✅ Found ${analizaSubjects.length} subjects:`);
    analizaSubjects.slice(0, 5).forEach((subject, index) => {
      console.log(`   ${index + 1}. ${subject.name} (${subject.timetableEntries.length} entries)`);
    });
    console.log('');

    console.log('✨ Demo completed successfully!');
    console.log('\n💡 Tips:');
    console.log('   - Fields contain years and their timetable URLs');
    console.log('   - Subjects contain all timetable entries across all fields');
    console.log('   - Cache is stored in JSON files in backend/cache/');
    console.log('   - Files: fields.json, subjects.json, metadata.json');
    console.log('   - Use API endpoints to access cached data\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

