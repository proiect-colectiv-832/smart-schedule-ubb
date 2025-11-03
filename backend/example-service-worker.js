// Service Worker for handling push notifications
// This file should be placed in your web app's public directory as 'sw.js'

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body || data.message,
      icon: data.icon || '/icons/notification-icon-192.png',
      badge: data.badge || '/icons/badge-icon-96.png',
      image: data.image,
      vibrate: data.vibrate || [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.data?.notificationId || 'smart-schedule-notification',
      data: data.data || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action) {
    console.log('Action clicked:', event.action);
    
    // Handle specific actions
    switch (event.action) {
      case 'view':
        // Open the app to view details
        event.waitUntil(
          clients.openWindow(event.notification.data.url || '/')
        );
        break;
      case 'dismiss':
        // Just close, no action needed
        break;
      default:
        console.log('Unknown action:', event.action);
    }
  } else {
    // Default click action - open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification);
  
  // Optionally track notification dismissal
  // You could send analytics data here
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    // Re-subscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then(function(subscription) {
      // Send new subscription to server
      return fetch('/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'current-user-id', // You need to store this somehow
          subscription: subscription
        })
      });
    })
  );
});

console.log('Smart Schedule UBB Service Worker loaded');
