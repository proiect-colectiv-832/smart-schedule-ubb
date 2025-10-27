/**
 * Example usage of the UBB Timetable Parser
 */

import { parseTimetable, parseMultipleTimetables, exportToJson, createTimetableHash } from './index';

async function exampleUsage() {
  try {
    // Example 1: Parse a single timetable
    console.log('=== Example 1: Single Timetable ===');
    const url = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html';
    const timetable = await parseTimetable(url);
    
    console.log(`Academic Year: ${timetable.academicYear}`);
    console.log(`Semester: ${timetable.semester}`);
    console.log(`Specialization: ${timetable.specialization}`);
    console.log(`Year of Study: ${timetable.yearOfStudy}`);
    console.log(`Number of entries: ${timetable.entries.length}`);
    
    // Show first few entries
    console.log('\nFirst 3 entries:');
    timetable.entries.slice(0, 3).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.day} ${entry.hours} - ${entry.subject} (${entry.type}) - ${entry.teacher}`);
    });
    
    // Example 2: Export to JSON
    console.log('\n=== Example 2: Export to JSON ===');
    const jsonData = exportToJson(timetable);
    console.log('JSON export length:', jsonData.length, 'characters');
    
    // Example 3: Create hash for change detection
    console.log('\n=== Example 3: Create Hash ===');
    const hash = createTimetableHash(timetable);
    console.log('Timetable hash:', hash);
    
    // Example 4: Parse multiple timetables
    console.log('\n=== Example 4: Multiple Timetables ===');
    const urls = [
      'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html',
      'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/CTI3.html',
      // Add more URLs as needed
    ];
    
    const timetables = await parseMultipleTimetables(urls);
    console.log(`Successfully parsed ${timetables.length} timetables`);
    timetables.forEach((tt, index) => {
      console.log(`${index + 1}. ${tt.specialization}${tt.yearOfStudy} - ${tt.entries.length} entries`);
    });
    
  } catch (error) {
    console.error('Error in example usage:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}
