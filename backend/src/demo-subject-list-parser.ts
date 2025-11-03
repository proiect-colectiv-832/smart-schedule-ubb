/**
 * Demo script to test the course parser with real data from UBB website
 * Real course list: all disciplines from CS UBB 2025-1
 *
 * Usage:
 *   npx ts-node src/demo-course-parser.ts
 */

import { parseCourseList, CourseList } from './subject-list-parser';

const UBB_COURSE_LIST_URL = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/disc/index.html';

async function main() {
    try {
        console.log('🚀 Fetching course list from UBB website...');
        console.log(`🔗 URL: ${UBB_COURSE_LIST_URL}\n`);

        // Parse the course list from the real website
        const courseList: CourseList = await parseCourseList(UBB_COURSE_LIST_URL);

        console.log('✅ Successfully parsed course list!');
        console.log(`📊 Total courses: ${courseList.totalCount}\n`);

        // Display all courses
        console.log('📋 All Courses:\n');
        courseList.courses.forEach((course, index) => {
            console.log(`${index + 1}. ${course.code} - ${course.name}`);
            console.log(`   🔗 Link: ${course.href}\n`);
        });

        // Unique first letters of course names
        const initials = [...new Set(courseList.courses.map(c => c.name.charAt(0).toUpperCase()))];
        console.log('📌 Unique initials of course names:', initials.join(', '));

        // Statistics
        console.log('\n📈 Statistics:');
        console.log(`   Total courses: ${courseList.totalCount}`);
        console.log(`   Unique initials: ${initials.length}`);

        console.log('\n✨ Demo completed successfully!');

    } catch (error) {
        console.error('❌ Error parsing course list:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Run the demo
main();
