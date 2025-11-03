import { PushNotificationManager } from './push-notification-manager';
import { createNotification } from './notification-manager';
import { NotificationType, NotificationPriority } from './notification-types';
import http from 'http';

async function demoPushNotifications() {
  console.log('🚀 Smart Schedule UBB - Push Notifications Demo\n');
  console.log('='.repeat(60));

  // Create a simple HTTP server for the demo
  const app = require('express')();
  const server = http.createServer(app);
  
  // Initialize push notification manager
  const pushManager = new PushNotificationManager(server);
  
  console.log('\n📱 Step 1: Starting server and push manager...');
  
  // Start server on a different port for demo
  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`✅ Demo server running on port ${PORT}`);
  });

  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n🔑 Step 2: Getting VAPID public key...');
  const publicKey = await pushManager.getVapidPublicKey();
  if (publicKey) {
    console.log(`✅ VAPID Public Key: ${publicKey.substring(0, 40)}...`);
  } else {
    console.log('❌ Failed to get VAPID public key');
    return;
  }

  console.log('\n📋 Step 3: Simulating push subscription registration...');
  
  // Simulate a web push subscription (normally comes from browser)
  const mockSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint-123',
    keys: {
      p256dh: 'mock-p256dh-key-' + Math.random().toString(36).substring(7),
      auth: 'mock-auth-key-' + Math.random().toString(36).substring(7)
    }
  };

  try {
    await pushManager.registerPushSubscription('student_123', mockSubscription);
    console.log('✅ Mock push subscription registered');
  } catch (error) {
    console.log('❌ Failed to register subscription:', error);
  }

  console.log('\n📊 Step 4: Getting push statistics...');
  const stats = pushManager.getStats();
  console.log('Statistics:', JSON.stringify(stats, null, 2));

  console.log('\n📢 Step 5: Creating and sending notifications...');
  
  // Create a notification
  const notification1 = await createNotification({
    userId: 'student_123',
    type: NotificationType.SCHEDULE_CHANGE,
    title: '🏫 Room Changed',
    message: 'Your Programming class room has been changed from A101 to B205',
    data: {
      subject: 'Programming',
      oldRoom: 'A101',
      newRoom: 'B205'
    },
    priority: NotificationPriority.HIGH
  });

  console.log(`✅ Created notification: ${notification1.title}`);

  try {
    // Send push notification
    await pushManager.sendPushNotification('student_123', notification1, {
      icon: '/icons/room-change.png',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
    console.log('✅ Push notification sent (would fail with mock subscription, but logic works)');
  } catch (error) {
    console.log('⚠️  Expected error with mock subscription - this is normal for demo');
  }

  console.log('\n📡 Step 6: Testing broadcast functionality...');
  
  const broadcastNotification = await createNotification({
    userId: 'system',
    type: NotificationType.ANNOUNCEMENT,
    title: '📢 System Maintenance',
    message: 'The system will be under maintenance tomorrow from 2:00 AM to 4:00 AM',
    data: {
      maintenanceStart: '2025-11-04T02:00:00Z',
      maintenanceEnd: '2025-11-04T04:00:00Z'
    },
    priority: NotificationPriority.NORMAL
  });

  try {
    await pushManager.broadcastNotification(broadcastNotification);
    console.log('✅ Broadcast notification sent');
  } catch (error) {
    console.log('⚠️  Expected error with mock subscription - this is normal for demo');
  }

  console.log('\n🔍 Step 7: Getting user subscriptions...');
  const userSubs = await pushManager.getUserSubscriptions('student_123');
  console.log(`Found ${userSubs.length} subscriptions for student_123`);

  console.log('\n📊 Step 8: Final statistics...');
  const finalStats = pushManager.getStats();
  console.log('Final Statistics:', JSON.stringify(finalStats, null, 2));

  console.log('\n='.repeat(60));
  console.log('✨ Push Notifications Demo completed!\n');
  
  console.log('💡 Integration Tips:');
  console.log('   1. Web Frontend: Use service workers to register for push notifications');
  console.log('   2. Mobile Apps: Integrate with platform-specific push services');
  console.log('   3. Real-time: WebSocket connections provide instant notifications');
  console.log('   4. Offline: Web push notifications work even when app is closed');
  console.log('   5. Security: VAPID keys ensure authenticated push messages');
  
  console.log('\n📚 Client Integration Example:');
  console.log(`
  // Register for push notifications in your web app
  navigator.serviceWorker.register('/sw.js').then(registration => {
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: '${publicKey}'
    });
  }).then(subscription => {
    fetch('/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'current-user-id',
        subscription: subscription
      })
    });
  });
  `);

  // Close server
  server.close();
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the demo
demoPushNotifications().catch(console.error);
