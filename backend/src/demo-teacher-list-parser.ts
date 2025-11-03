/**
 * Demo script to test the teacher list parser with real data from UBB website
 *
 * Usage:
 *   npx ts-node src/demo-teacher-list-parser.ts
 */

import {
  parseTeacherList,
  filterTeachersByTitle,
  groupTeachersByTitle,
  searchTeachersByName
} from './teacher-list-parser';

const UBB_TEACHERS_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/cadre/index.html';

async function main() {
  try {
    console.log('🚀 Fetching teacher list from UBB website...');
    console.log(`URL: ${UBB_TEACHERS_URL}\n`);

    // Parse teachers from the real website
    const result = await parseTeacherList(UBB_TEACHERS_URL);

    console.log('✅ Successfully parsed teachers!');
    console.log(`📊 Total teachers found: ${result.totalCount}\n`);

    // Group by title
    const grouped = groupTeachersByTitle(result.teachers);

    console.log('👨‍🏫 Teachers by Academic Title:\n');

    // Show professors
    if (grouped['Prof.']) {
      console.log(`🎓 Professors (Prof.): ${grouped['Prof.'].length}`);
      grouped['Prof.'].slice(0, 5).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['Prof.'].length > 5) {
        console.log(`   ... and ${grouped['Prof.'].length - 5} more\n`);
      } else {
        console.log('');
      }
    }

    // Show associate professors
    if (grouped['Conf.']) {
      console.log(`🎓 Associate Professors (Conf.): ${grouped['Conf.'].length}`);
      grouped['Conf.'].slice(0, 5).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['Conf.'].length > 5) {
        console.log(`   ... and ${grouped['Conf.'].length - 5} more\n`);
      } else {
        console.log('');
      }
    }

    // Show lecturers
    if (grouped['Lect.']) {
      console.log(`🎓 Lecturers (Lect.): ${grouped['Lect.'].length}`);
      grouped['Lect.'].slice(0, 5).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['Lect.'].length > 5) {
        console.log(`   ... and ${grouped['Lect.'].length - 5} more\n`);
      } else {
        console.log('');
      }
    }

    // Show assistants
    if (grouped['Asist.']) {
      console.log(`🎓 Assistants (Asist.): ${grouped['Asist.'].length}`);
      grouped['Asist.'].slice(0, 5).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['Asist.'].length > 5) {
        console.log(`   ... and ${grouped['Asist.'].length - 5} more\n`);
      } else {
        console.log('');
      }
    }

    // Show PhD students
    if (grouped['Drd.']) {
      console.log(`🎓 PhD Students (Drd.): ${grouped['Drd.'].length}`);
      grouped['Drd.'].slice(0, 3).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['Drd.'].length > 3) {
        console.log(`   ... and ${grouped['Drd.'].length - 3} more\n`);
      } else {
        console.log('');
      }
    }

    // Show associate teaching staff
    if (grouped['C.d.asociat']) {
      console.log(`🎓 Associate Staff (C.d.asociat): ${grouped['C.d.asociat'].length}`);
      grouped['C.d.asociat'].slice(0, 3).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.fullName} → ${teacher.href}`);
      });
      if (grouped['C.d.asociat'].length > 3) {
        console.log(`   ... and ${grouped['C.d.asociat'].length - 3} more\n`);
      } else {
        console.log('');
      }
    }

    // Statistics
    console.log('\n📈 Statistics:');
    Object.keys(grouped).forEach(title => {
      console.log(`   ${title}: ${grouped[title].length} teachers`);
    });

    // Example: Search for specific teachers
    console.log('\n🔍 Example Search - Teachers with "POP" in name:');
    const popTeachers = searchTeachersByName(result.teachers, 'POP');
    popTeachers.slice(0, 5).forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher.fullName}`);
    });
    if (popTeachers.length > 5) {
      console.log(`   ... and ${popTeachers.length - 5} more`);
    }

    // Example: Filter professors
    const professors = filterTeachersByTitle(result.teachers, 'Prof.');
    console.log(`\n👨‍🏫 Total Professors: ${professors.length}`);

    console.log('\n✨ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error parsing teacher list:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the demo
main();

