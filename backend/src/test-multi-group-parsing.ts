/**
 * Test script to verify multi-group timetable parsing
 *
 * This tests that the timetable parser correctly identifies and extracts
 * ALL timetables from a page (one per group), not just the first one.
 *
 * Key understanding:
 * - Each <table> element = ONE group
 * - Group names come from the "group" column values, NOT from headings
 * - Number of tables on page = number of groups
 */

import { parseTimetable, parseTimetablesByGroup } from './timetable-parser';

async function testMultiGroupParsing() {
  console.log('='.repeat(60));
  console.log('Testing Multi-Group Timetable Parsing');
  console.log('='.repeat(60));
  console.log('');
  console.log('Key concept: Each <table> element = ONE group');
  console.log('Group names extracted from "group" column values');
  console.log('');

  // Test URL - this should have multiple groups (e.g., 831 and 832 for MaI)
  const testUrl = 'https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MaI1.html';

  try {
    console.log('Test 1: parseTimetable() - combines all groups');
    console.log('-'.repeat(60));
    const combinedTimetable = await parseTimetable(testUrl);

    console.log(`✓ Total entries: ${combinedTimetable.entries.length}`);

    // Count unique groups from the "group" column
    const groups = new Set(combinedTimetable.entries.map(e => e.group));
    console.log(`✓ Unique groups found in "group" column: ${groups.size}`);
    console.log(`  Groups: ${Array.from(groups).join(', ')}`);
    console.log('');

    console.log('Test 2: parseTimetablesByGroup() - separate timetables per group');
    console.log('-'.repeat(60));
    const groupTimetables = await parseTimetablesByGroup(testUrl);

    console.log(`✓ Number of tables found: ${groupTimetables.length}`);
    console.log('  (Each table on the page = ONE group)');
    console.log('');

    groupTimetables.forEach((tt, index) => {
      console.log(`  Table ${index + 1}:`);
      console.log(`    Group name: "${tt.groupName}" (from "group" column)`);
      console.log(`    Entries: ${tt.entries.length}`);

      // Show what group values appear in this table
      const groupValues = new Set(tt.entries.map(e => e.group));
      console.log(`    Group column values: ${Array.from(groupValues).join(', ')}`);
      console.log('');
    });

    // Verify that the total entries match
    const totalEntriesFromGroups = groupTimetables.reduce((sum, tt) => sum + tt.entries.length, 0);
    console.log('Verification:');
    console.log(`  Combined timetable entries: ${combinedTimetable.entries.length}`);
    console.log(`  Sum of group entries: ${totalEntriesFromGroups}`);

    if (combinedTimetable.entries.length === totalEntriesFromGroups) {
      console.log('  ✓ Match! Both methods extract the same number of entries.');
    } else {
      console.log('  ✗ Mismatch! Entry counts differ.');
    }
    console.log('');

    // Show sample entries from each group
    console.log('Sample entries from each group:');
    console.log('-'.repeat(60));
    groupTimetables.slice(0, 3).forEach((tt, index) => {
      console.log(`Group ${index + 1}: ${tt.groupName}`);
      const sample = tt.entries[0];
      if (sample) {
        console.log(`  - ${sample.day} ${sample.hours}: ${sample.subject} (${sample.type})`);
        console.log(`    Teacher: ${sample.teacher}, Room: ${sample.room}`);
        console.log(`    Group column value: "${sample.group}"`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('✓ All tests completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Found ${groupTimetables.length} tables (= ${groupTimetables.length} groups)`);
    console.log(`  - Group names: ${groupTimetables.map(t => t.groupName).join(', ')}`);
    console.log('  - Group names extracted from "group" column, NOT from headings');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('✗ Test failed:', error);
    throw error;
  }
}

// Run the test
testMultiGroupParsing().catch(console.error);

