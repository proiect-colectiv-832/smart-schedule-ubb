/**
 * Complete Example: Calendar Subscription Feature
 *
 * This example demonstrates the entire workflow of:
 * 1. Creating a user timetable from scraped university data
 * 2. Adding custom events
 * 3. Generating a calendar subscription URL
 * 4. Subscribing to the calendar in various apps
 */

import {
  convertTimetableEntriesToEvents,
  getDefaultSemesterDates
} from './timetable-to-events-converter';
import {
  generateCalendarToken,
  getUserIdFromToken,
  initializeTokenManager
} from './calendar-token-manager';
import {
  saveUserTimetable,
  addUserEvent,
  getUserTimetable,
  initializeUserTimetableManager
} from './user-timetable-manager';
import {
  generateICalendar,
  getCalendarMetadata
} from './icalendar-generator';
import { TimetableEntry } from '../types';

async function runCompleteExample() {
  console.log('='.repeat(70));
  console.log('📅 Complete Calendar Subscription Example');
  console.log('='.repeat(70));

  // Initialize managers
  await initializeTokenManager();
  await initializeUserTimetableManager();

  const userId = 'student-mie3-john';

  // Step 1: Simulate scraped timetable data from university website
  console.log('\n📚 Step 1: Convert Scraped University Timetable');
  console.log('-'.repeat(70));

  const scrapedEntries: TimetableEntry[] = [
    {
      day: 'Luni',
      hours: '8-10',
      frequency: '1-14',
      room: 'C310',
      group: 'MIE3',
      type: 'Curs',
      subject: 'Tehnologii Web',
      teacher: 'Prof. Dr. Ion Popescu'
    },
    {
      day: 'Luni',
      hours: '10-12',
      frequency: 'săpt. 1',
      room: 'Lab 320',
      group: '931/1',
      type: 'Lab',
      subject: 'Tehnologii Web',
      teacher: 'Lect. Dr. Maria Ionescu'
    },
    {
      day: 'Marți',
      hours: '14-16',
      frequency: '1-14',
      room: 'C215',
      group: 'MIE3',
      type: 'Curs',
      subject: 'Inteligență Artificială',
      teacher: 'Prof. Dr. Andrei Georgescu'
    },
    {
      day: 'Miercuri',
      hours: '8-10',
      frequency: 'săpt. 2',
      room: 'Lab 115',
      group: '932',
      type: 'Lab',
      subject: 'Inteligență Artificială',
      teacher: 'Lect. Dr. Elena Dumitrescu'
    },
    {
      day: 'Joi',
      hours: '12-14',
      frequency: '1-14',
      room: 'C412',
      group: 'MIE3',
      type: 'Seminar',
      subject: 'Programare Mobilă',
      teacher: 'Lect. Dr. Vasile Stan'
    },
    {
      day: 'Vineri',
      hours: '10-12',
      frequency: '1-14',
      room: 'C310',
      group: 'MIE3',
      type: 'Curs',
      subject: 'Securitate Informatică',
      teacher: 'Prof. Dr. Ana Mureșan'
    }
  ];

  // Get semester dates
  const { start: semesterStart, end: semesterEnd } = getDefaultSemesterDates();
  console.log(`📆 Semester: ${semesterStart.toLocaleDateString()} - ${semesterEnd.toLocaleDateString()}`);

  // Convert scraped entries to user events
  const universityEvents = convertTimetableEntriesToEvents(
    scrapedEntries,
    semesterStart,
    semesterEnd
  );

  console.log(`✅ Converted ${scrapedEntries.length} timetable entries to ${universityEvents.length} calendar events`);

  // Step 2: Save user's timetable
  console.log('\n💾 Step 2: Save User Timetable');
  console.log('-'.repeat(70));

  await saveUserTimetable(userId, universityEvents, semesterStart, semesterEnd);
  console.log(`✅ Saved timetable for user: ${userId}`);

  // Step 3: Add custom events
  console.log('\n➕ Step 3: Add Custom Events');
  console.log('-'.repeat(70));

  // Add a one-time study session
  const studySession = await addUserEvent(userId, {
    title: 'Study Group - Web Technologies Project',
    startTime: new Date(semesterStart.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks into semester
    endTime: new Date(semesterStart.getTime() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    location: 'Library - Study Room A',
    description: 'Work on the final project with the team',
    isRecurring: false,
    type: 'custom',
    color: '#2ecc71'
  });

  console.log(`✅ Added custom event: ${studySession.title}`);

  // Add recurring office hours
  const nextMonday = new Date(semesterStart);
  nextMonday.setDate(nextMonday.getDate() + (1 + 7 - nextMonday.getDay()) % 7);
  nextMonday.setHours(16, 0, 0, 0);

  const officeHoursEnd = new Date(nextMonday);
  officeHoursEnd.setHours(17, 0, 0, 0);

  const officeHours = await addUserEvent(userId, {
    title: 'Office Hours - Prof. Popescu',
    startTime: nextMonday,
    endTime: officeHoursEnd,
    location: 'C310',
    description: 'Weekly office hours for questions',
    isRecurring: true,
    recurrenceRule: {
      frequency: 'weekly',
      daysOfWeek: [1], // Monday
      until: semesterEnd
    },
    type: 'custom',
    color: '#9b59b6'
  });

  console.log(`✅ Added recurring event: ${officeHours.title}`);

  // Step 4: Generate calendar subscription token
  console.log('\n🔐 Step 4: Generate Calendar Subscription Token');
  console.log('-'.repeat(70));

  const token = await generateCalendarToken(userId);
  const subscriptionUrl = `http://localhost:3000/calendar/${token}.ics`;

  console.log(`✅ Token generated: ${token}`);
  console.log(`📅 Subscription URL: ${subscriptionUrl}`);

  // Step 5: Generate and display calendar metadata
  console.log('\n📊 Step 5: Calendar Metadata');
  console.log('-'.repeat(70));

  const timetable = await getUserTimetable(userId);
  if (timetable) {
    const metadata = getCalendarMetadata(timetable);
    console.log(`📚 Total Events: ${metadata.totalEvents}`);
    console.log(`🔄 Recurring Events: ${metadata.recurringEvents}`);
    console.log(`📅 One-time Events: ${metadata.oneTimeEvents}`);
    console.log(`\n📋 Events by Type:`);
    Object.entries(metadata.eventsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  // Step 6: Generate sample iCalendar feed
  console.log('\n📄 Step 6: Sample iCalendar Feed');
  console.log('-'.repeat(70));

  if (timetable) {
    const icalFeed = await generateICalendar(timetable, userId);

    // Display first 1000 characters as preview
    console.log('iCalendar Preview:');
    console.log('-'.repeat(70));
    console.log(icalFeed.substring(0, 1000));
    console.log('...');
    console.log('-'.repeat(70));
    console.log(`Total length: ${icalFeed.length} characters`);
  }

  // Step 7: Instructions for subscribing
  console.log('\n📱 Step 7: How to Subscribe to Your Calendar');
  console.log('-'.repeat(70));

  console.log('\n🍎 Apple Calendar (macOS/iOS):');
  console.log('   1. Open Calendar app');
  console.log('   2. File → New Calendar Subscription (or Settings on iOS)');
  console.log(`   3. Paste: ${subscriptionUrl}`);
  console.log('   4. Choose refresh frequency: Every hour');
  console.log('   5. Click Subscribe');

  console.log('\n🌐 Google Calendar:');
  console.log('   1. Open Google Calendar (calendar.google.com)');
  console.log('   2. Click "+" next to "Other calendars"');
  console.log('   3. Select "From URL"');
  console.log(`   4. Paste: ${subscriptionUrl}`);
  console.log('   5. Click "Add calendar"');

  console.log('\n📧 Microsoft Outlook:');
  console.log('   1. Open Outlook');
  console.log('   2. File → Account Settings → Internet Calendars');
  console.log('   3. Click "New"');
  console.log(`   4. Paste: ${subscriptionUrl}`);
  console.log('   5. Click "Add"');

  console.log('\n🔗 Direct Link:');
  console.log(`   ${subscriptionUrl}`);

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('✨ Summary');
  console.log('='.repeat(70));
  console.log(`
✅ Created personalized timetable for: ${userId}
📚 University courses: ${scrapedEntries.length}
➕ Custom events: 2
🔐 Calendar token: ${token}
📅 Subscription URL: ${subscriptionUrl}

🎉 Your calendar is ready!
   Subscribe using the URL above in your favorite calendar app.
   The calendar will automatically update when you modify your timetable.

💡 Next steps:
   - Add more custom events via POST /timetable/event
   - Update existing events via PUT /timetable/event
   - View in calendar app within 1 hour (or force refresh)
   - Share the URL with classmates (each needs their own token!)
  `);

  console.log('='.repeat(70));
}

// Run the example
runCompleteExample().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
