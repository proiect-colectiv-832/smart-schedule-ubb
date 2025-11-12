// Client-side JavaScript for web push notifications integration
// This code should be included in your web application

class SmartSchedulePushClient {
  constructor(apiBaseUrl = 'http://localhost:3000') {
    this.apiBaseUrl = apiBaseUrl;
    this.userId = null;
    this.subscription = null;
    this.isSupported = this.checkSupport();
  }

  checkSupport() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async initialize(userId) {
    this.userId = userId;

    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check for existing subscription
      this.subscription = await registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('Existing push subscription found');
        // Optionally re-register with server to ensure it's still valid
        await this.registerWithServer(this.subscription);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async getVapidPublicKey() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/push/vapid-public-key`);
      const data = await response.json();
      
      if (data.success) {
        return data.data.publicKey;
      } else {
        throw new Error(data.error || 'Failed to get VAPID public key');
      }
    } catch (error) {
      console.error('Error getting VAPID public key:', error);
      throw error;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else if (permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    } else {
      console.log('Notification permission dismissed');
      return false;
    }
  }

  async subscribe() {
    if (!this.userId) {
      throw new Error('User ID not set. Call initialize() first.');
    }

    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      // Get VAPID public key
      const publicKey = await this.getVapidPublicKey();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      console.log('Push subscription created:', this.subscription);

      // Register with server
      await this.registerWithServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  async registerWithServer(subscription) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          subscription: subscription
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to register with server');
      }

      console.log('Push subscription registered with server');
      return true;
    } catch (error) {
      console.error('Error registering with server:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      console.log('No active subscription to unsubscribe from');
      return true;
    }

    try {
      // Unsubscribe from browser
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Notify server (optional - server will handle invalid subscriptions automatically)
        console.log('Unsubscribed from push notifications');
        this.subscription = null;
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/push/stats`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get stats');
      }
    } catch (error) {
      console.error('Error getting push stats:', error);
      throw error;
    }
  }

  // Helper function to convert VAPID public key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if user is subscribed
  isSubscribed() {
    return this.subscription !== null;
  }

  // Get subscription details
  getSubscription() {
    return this.subscription;
  }
}

// WebSocket client for real-time notifications
class SmartScheduleWebSocketClient {
  constructor(apiBaseUrl = 'http://localhost:3000') {
    this.apiBaseUrl = apiBaseUrl;
    this.socket = null;
    this.userId = null;
    this.isConnected = false;
    this.messageHandlers = {
      'new-notification': [],
      'pending-notifications': []
    };
  }

  async connect(userId) {
    this.userId = userId;

    // Import Socket.IO client (you need to include this in your HTML)
    // <script src="/socket.io/socket.io.js"></script>
    if (typeof io === 'undefined') {
      console.error('Socket.IO client not loaded. Include socket.io.js script.');
      return false;
    }

    try {
      this.socket = io(this.apiBaseUrl);

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        
        // Authenticate with user ID
        this.socket.emit('authenticate', { userId: this.userId });
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
      });

      this.socket.on('new-notification', (data) => {
        console.log('Real-time notification received:', data);
        this.handleMessage('new-notification', data);
      });

      this.socket.on('pending-notifications', (data) => {
        console.log('Pending notifications received:', data);
        this.handleMessage('pending-notifications', data);
      });

      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event, handler) {
    if (!this.messageHandlers[event]) {
      this.messageHandlers[event] = [];
    }
    this.messageHandlers[event].push(handler);
  }

  off(event, handler) {
    if (this.messageHandlers[event]) {
      const index = this.messageHandlers[event].indexOf(handler);
      if (index > -1) {
        this.messageHandlers[event].splice(index, 1);
      }
    }
  }

  handleMessage(event, data) {
    if (this.messageHandlers[event]) {
      this.messageHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }
}

// Usage example
/*
const pushClient = new SmartSchedulePushClient();
const wsClient = new SmartScheduleWebSocketClient();

// Initialize push notifications
async function setupNotifications(userId) {
  try {
    // Initialize push notifications
    const pushInitialized = await pushClient.initialize(userId);
    if (pushInitialized) {
      await pushClient.subscribe();
      console.log('✅ Push notifications enabled');
    }

    // Connect WebSocket for real-time notifications
    const wsConnected = await wsClient.connect(userId);
    if (wsConnected) {
      console.log('✅ WebSocket connected');
      
      // Handle real-time notifications
      wsClient.on('new-notification', (data) => {
        showNotificationInUI(data.notification);
      });
      
      wsClient.on('pending-notifications', (data) => {
        updateNotificationBadge(data.count);
      });
    }
  } catch (error) {
    console.error('Failed to setup notifications:', error);
  }
}

// Call when user logs in
setupNotifications('student_123');
*/

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmartSchedulePushClient, SmartScheduleWebSocketClient };
}
