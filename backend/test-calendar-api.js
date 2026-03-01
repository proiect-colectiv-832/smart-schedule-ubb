/**
 * Test script for Calendar Subscription API
 * Run with: node test-calendar-api.js
 */

const API_BASE = 'http://localhost:3000';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`\n📡 ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test scenarios
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Calendar Subscription API Tests');
  console.log('='.repeat(60));

  const testUserId = 'test-user-' + Date.now();
  let calendarToken = null;

  // Test 1: Get default semester dates
  console.log('\n📅 Test 1: Get Default Semester Dates');
  console.log('-'.repeat(60));
  await apiCall('/timetable/events/default-dates');

  // Test 2: Generate calendar token
  console.log('\n🔐 Test 2: Generate Calendar Token');
  console.log('-'.repeat(60));
  const tokenResult = await apiCall('/calendar/generate-token', {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId })
  });

  if (tokenResult.success) {
    calendarToken = tokenResult.data.data.token;
    console.log(`\n🎉 Calendar subscription URL:`);
    console.log(`   ${tokenResult.data.data.subscriptionUrl}`);
  }

  // Test 3: Create user timetable with events
  console.log('\n📚 Test 3: Create User Timetable');
  console.log('-'.repeat(60));

  const now = new Date();
  const semesterStart = new Date(now.getFullYear(), 9, 1); // October 1
  const semesterEnd = new Date(now.getFullYear() + 1, 0, 31); // January 31

  // Create a Monday lecture starting next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
  nextMonday.setHours(8, 0, 0, 0);

  const mondayLectureEnd = new Date(nextMonday);
  mondayLectureEnd.setHours(10, 0, 0, 0);

  // Create a Wednesday lab
  const nextWednesday = new Date(nextMonday);
  nextWednesday.setDate(nextMonday.getDate() + 2);
  nextWednesday.setHours(10, 0, 0, 0);

  const wednesdayLabEnd = new Date(nextWednesday);
  wednesdayLabEnd.setHours(12, 0, 0, 0);

  await apiCall('/timetable/user', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUserId,
      events: [
        {
          title: 'Web Technologies (Lecture)',
          startTime: nextMonday.toISOString(),
          endTime: mondayLectureEnd.toISOString(),
          location: 'C310',
          description: 'Teacher: Prof. John Smith\nGroup: MIE3\nType: Lecture',
          isRecurring: true,
          recurrenceRule: {
            frequency: 'weekly',
            daysOfWeek: [1], // Monday
            until: semesterEnd.toISOString()
          },
          type: 'lecture',
          color: '#3498db'
        },
        {
          title: 'Web Technologies (Lab)',
          startTime: nextWednesday.toISOString(),
          endTime: wednesdayLabEnd.toISOString(),
          location: 'Lab 320',
          description: 'Teacher: Prof. Jane Doe\nGroup: 931/1\nType: Laboratory',
          isRecurring: true,
          recurrenceRule: {
            frequency: 'oddweeks',
            daysOfWeek: [3], // Wednesday
            until: semesterEnd.toISOString()
          },
          type: 'lab',
          color: '#e74c3c'
        },
        {
          title: 'Project Meeting',
          startTime: new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          location: 'Online - Zoom',
          description: 'Weekly team sync',
          isRecurring: false,
          type: 'custom',
          color: '#2ecc71'
        }
      ],
      semesterStart: semesterStart.toISOString(),
      semesterEnd: semesterEnd.toISOString()
    })
  });

  // Test 4: Get user timetable
  console.log('\n📖 Test 4: Get User Timetable');
  console.log('-'.repeat(60));
  await apiCall(`/timetable/user?userId=${testUserId}`);

  // Test 5: Get calendar metadata
  console.log('\n📊 Test 5: Get Calendar Metadata');
  console.log('-'.repeat(60));
  await apiCall(`/icalendar/metadata?userId=${testUserId}`);

  // Test 6: Generate iCalendar (as JSON for inspection)
  console.log('\n📅 Test 6: Generate iCalendar Feed (JSON format)');
  console.log('-'.repeat(60));
  const icalResult = await apiCall(`/icalendar/generate?userId=${testUserId}&format=json`);

  if (icalResult.success) {
    console.log('\n📝 iCalendar Preview (first 500 chars):');
    const icalContent = icalResult.data.data.icalendar;
    console.log(icalContent.substring(0, 500) + '...\n');
  }

  // Test 7: Add a custom event
  console.log('\n➕ Test 7: Add Custom Event');
  console.log('-'.repeat(60));
  const customEventDate = new Date(nextMonday);
  customEventDate.setDate(customEventDate.getDate() + 14);
  customEventDate.setHours(14, 0, 0, 0);

  const customEventEnd = new Date(customEventDate);
  customEventEnd.setHours(16, 0, 0, 0);

  await apiCall('/timetable/event', {
    method: 'POST',
    body: JSON.stringify({
      userId: testUserId,
      event: {
        title: 'Exam Review Session',
        startTime: customEventDate.toISOString(),
        endTime: customEventEnd.toISOString(),
        location: 'Study Room A',
        description: 'Final exam preparation',
        isRecurring: false,
        type: 'custom'
      }
    })
  });

  // Test 8: Get timetable stats
  console.log('\n📊 Test 8: Get Timetable Statistics');
  console.log('-'.repeat(60));
  await apiCall('/timetable/stats');

  // Test 9: Get all tokens for user
  console.log('\n🔑 Test 9: Get User Tokens');
  console.log('-'.repeat(60));
  await apiCall(`/calendar/tokens?userId=${testUserId}`);

  // Test 10: Get token stats
  console.log('\n📈 Test 10: Get Token Statistics');
  console.log('-'.repeat(60));
  await apiCall('/calendar/token-stats');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Test Summary');
  console.log('='.repeat(60));
  console.log(`\n✅ All tests completed!`);

  if (calendarToken) {
    console.log(`\n📅 Your calendar subscription URL:`);
    console.log(`   ${API_BASE}/calendar/${calendarToken}.ics`);
    console.log(`\n💡 How to use:`);
    console.log(`   1. Copy the URL above`);
    console.log(`   2. Open your calendar app (Apple Calendar, Google Calendar, etc.)`);
    console.log(`   3. Add a new calendar subscription`);
    console.log(`   4. Paste the URL`);
    console.log(`   5. Your timetable will appear in your calendar!`);

    console.log(`\n🔗 Direct link to iCalendar file:`);
    console.log(`   ${API_BASE}/calendar/${calendarToken}.ics`);

    console.log(`\n🧪 To clean up test data later, run:`);
    console.log(`   curl -X DELETE ${API_BASE}/calendar/token/${calendarToken}`);
    console.log(`   curl -X DELETE ${API_BASE}/timetable/user -H "Content-Type: application/json" -d '{"userId":"${testUserId}"}'`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

