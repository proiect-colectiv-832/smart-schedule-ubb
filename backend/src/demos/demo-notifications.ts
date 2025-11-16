/**
 * Demo script for Notifications API
 * 
 * Usage:
 *   npx ts-node src/demo-notifications.ts
 */

import axios from 'axios';
import { NotificationType, NotificationPriority } from '../notifications/notification-types';

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'demo_student_456';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demoNotificationsAPI() {
  console.log('🚀 Smart Schedule UBB - Notifications API Demo\n');
  console.log('='.repeat(60));

  try {
    // 1. Create various types of notifications
    console.log('\n📢 Step 1: Creating different types of notifications...\n');

    const scheduleChangeNotif = await axios.post(`${BASE_URL}/notifications`, {
      userId: TEST_USER_ID,
      type: NotificationType.SCHEDULE_CHANGE,
      title: '🏫 Room Changed',
      message: 'Your Object-Oriented Programming class room has been changed from C309 to C205 on November 5th',
      priority: NotificationPriority.HIGH,
      data: {
        subject: 'Object-Oriented Programming',
        oldRoom: 'C309',
        newRoom: 'C205',
        date: '2025-11-05'
      },
      actionUrl: '/schedule',
      actionText: 'View Schedule'
    });

    console.log('✅ Schedule change notification created:', scheduleChangeNotif.data.data.id);

    const newCourseNotif = await axios.post(`${BASE_URL}/notifications`, {
      userId: TEST_USER_ID,
      type: NotificationType.NEW_COURSE,
      title: '📚 New Course Added',
      message: 'A new elective course "Machine Learning Fundamentals" has been added to your program',
      priority: NotificationPriority.NORMAL,
      data: {
        courseName: 'Machine Learning Fundamentals',
        courseCode: 'ML101'
      }
    });

    console.log('✅ New course notification created:', newCourseNotif.data.data.id);

    const urgentReminder = await axios.post(`${BASE_URL}/notifications`, {
      userId: TEST_USER_ID,
      type: NotificationType.REMINDER,
      title: '⚠️ Assignment Due Soon',
      message: 'Your Data Structures project is due in 2 hours!',
      priority: NotificationPriority.URGENT,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Expires in 2 hours
      actionUrl: '/assignments/ds-project',
      actionText: 'Submit Assignment'
    });

    console.log('✅ Urgent reminder created:', urgentReminder.data.data.id);

    // 2. Use convenience endpoint for schedule changes
    console.log('\n📅 Step 2: Using schedule change convenience endpoint...\n');

    const teacherChange = await axios.post(`${BASE_URL}/notifications/schedule-change`, {
      userId: TEST_USER_ID,
      changeType: 'teacher',
      subject: 'Database Systems',
      oldValue: 'Prof. Smith',
      newValue: 'Prof. Johnson',
      date: '2025-11-06'
    });

    console.log('✅ Teacher change notification created:', teacherChange.data.data.id);

    await sleep(1000);

    // 3. Get all notifications for user
    console.log('\n📋 Step 3: Retrieving all notifications for user...\n');

    const allNotifications = await axios.get(`${BASE_URL}/notifications?userId=${TEST_USER_ID}`);
    console.log(`📊 Found ${allNotifications.data.data.length} notifications:`);
    
    allNotifications.data.data.forEach((notif: any, index: number) => {
      console.log(`   ${index + 1}. [${notif.priority.toUpperCase()}] ${notif.title}`);
      console.log(`      Type: ${notif.type}`);
      console.log(`      Read: ${notif.read ? '✅' : '📬'}`);
      console.log('');
    });

    // 4. Get statistics
    console.log('\n📊 Step 4: Getting notification statistics...\n');

    const stats = await axios.get(`${BASE_URL}/notifications/stats?userId=${TEST_USER_ID}`);
    console.log('Statistics:', JSON.stringify(stats.data.data, null, 2));

    // 5. Mark specific notification as read
    console.log('\n📖 Step 5: Marking a notification as read...\n');

    const notificationToRead = allNotifications.data.data[0];
    await axios.put(`${BASE_URL}/notifications/${notificationToRead.id}/read`);
    console.log(`✅ Marked notification "${notificationToRead.title}" as read`);

    // 6. Get only unread notifications
    console.log('\n📬 Step 6: Getting only unread notifications...\n');

    const unreadNotifications = await axios.get(`${BASE_URL}/notifications?userId=${TEST_USER_ID}&read=false`);
    console.log(`📬 Found ${unreadNotifications.data.data.length} unread notifications:`);
    
    unreadNotifications.data.data.forEach((notif: any, index: number) => {
      console.log(`   ${index + 1}. [${notif.priority.toUpperCase()}] ${notif.title}`);
    });

    // 7. Filter by type and priority
    console.log('\n🔍 Step 7: Filtering by type and priority...\n');

    const highPriorityNotifications = await axios.get(
      `${BASE_URL}/notifications?userId=${TEST_USER_ID}&priority=high`
    );
    console.log(`⚡ Found ${highPriorityNotifications.data.data.length} high priority notifications`);

    const scheduleNotifications = await axios.get(
      `${BASE_URL}/notifications?userId=${TEST_USER_ID}&type=schedule_change`
    );
    console.log(`📅 Found ${scheduleNotifications.data.data.length} schedule change notifications`);

    // 8. Mark all as read
    console.log('\n📖 Step 8: Marking all notifications as read...\n');

    const markAllResult = await axios.put(`${BASE_URL}/notifications/read-all`, {
      userId: TEST_USER_ID
    });
    console.log(`✅ Marked ${markAllResult.data.data.markedCount} notifications as read`);

    // 9. Final statistics
    console.log('\n📊 Step 9: Final statistics...\n');

    const finalStats = await axios.get(`${BASE_URL}/notifications/stats?userId=${TEST_USER_ID}`);
    console.log('Final Statistics:');
    console.log(`   Total: ${finalStats.data.data.total}`);
    console.log(`   Unread: ${finalStats.data.data.unread}`);
    console.log('   By Type:', JSON.stringify(finalStats.data.data.byType, null, 4));
    console.log('   By Priority:', JSON.stringify(finalStats.data.data.byPriority, null, 4));

    console.log('\n' + '='.repeat(60));
    console.log('✨ Notifications API demo completed successfully!');
    console.log('='.repeat(60));

    console.log('\n💡 Integration Tips:');
    console.log('   1. Use WebSockets or Server-Sent Events for real-time notifications');
    console.log('   2. Implement push notifications for mobile apps');
    console.log('   3. Add email/SMS notification options');
    console.log('   4. Create notification preferences/settings for users');
    console.log('   5. Add bulk operations for admin users');

  } catch (error: any) {
    console.error('\n❌ Error during demo:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the demo
demoNotificationsAPI().catch(console.error);
