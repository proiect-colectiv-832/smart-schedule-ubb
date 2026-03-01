import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { getNotifications } from './notification-manager';
import { Notification, NotificationType, NotificationPriority } from './notification-types';

interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

interface WebSocketConnection {
  id: string;
  userId: string;
  socketId: string;
  connectedAt: string;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export class PushNotificationManager {
  private io: SocketIOServer;
  private subscriptions: Map<string, PushSubscription> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  
  private readonly SUBSCRIPTIONS_FILE = path.join(__dirname, '..', 'cache', 'push-subscriptions.json');
  private readonly VAPID_KEYS_FILE = path.join(__dirname, '..', 'cache', 'vapid-keys.json');

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupWebPush();
    this.setupSocketIO();
    this.loadSubscriptions();
  }

  private async setupWebPush() {
    try {
      // Try to load existing VAPID keys
      const vapidKeys = await this.loadVapidKeys();
      if (vapidKeys) {
        webpush.setVapidDetails(
          'mailto:your-email@example.com', // Replace with your email
          vapidKeys.publicKey,
          vapidKeys.privateKey
        );
      } else {
        // Generate new VAPID keys
        const keys = webpush.generateVAPIDKeys();
        await this.saveVapidKeys(keys);
        webpush.setVapidDetails(
          'mailto:your-email@example.com', // Replace with your email
          keys.publicKey,
          keys.privateKey
        );
        console.log('🔑 Generated new VAPID keys for web push notifications');
      }
    } catch (error) {
      console.error('❌ Failed to setup web push:', error);
    }
  }

  private async loadVapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
    try {
      const data = await fs.readFile(this.VAPID_KEYS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async saveVapidKeys(keys: { publicKey: string; privateKey: string }): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.VAPID_KEYS_FILE), { recursive: true });
      await fs.writeFile(this.VAPID_KEYS_FILE, JSON.stringify(keys, null, 2));
    } catch (error) {
      console.error('❌ Failed to save VAPID keys:', error);
    }
  }

  private setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log(`📱 WebSocket connected: ${socket.id}`);

      // Handle user authentication/identification
      socket.on('authenticate', (data: { userId: string }) => {
        const connection: WebSocketConnection = {
          id: uuidv4(),
          userId: data.userId,
          socketId: socket.id,
          connectedAt: new Date().toISOString()
        };

        this.connections.set(socket.id, connection);
        
        // Add to user connections mapping
        if (!this.userConnections.has(data.userId)) {
          this.userConnections.set(data.userId, new Set());
        }
        this.userConnections.get(data.userId)!.add(socket.id);

        console.log(`✅ User ${data.userId} authenticated on socket ${socket.id}`);
        
        // Send any pending notifications
        this.sendPendingNotifications(data.userId, socket);
      });

      // Handle push subscription registration
      socket.on('register-push', async (data: { 
        userId: string; 
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } } 
      }) => {
        try {
          await this.registerPushSubscription(data.userId, data.subscription);
          socket.emit('push-registered', { success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          socket.emit('push-registered', { success: false, error: errorMessage });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📱 WebSocket disconnected: ${socket.id}`);
        
        const connection = this.connections.get(socket.id);
        if (connection) {
          // Remove from user connections mapping
          const userSockets = this.userConnections.get(connection.userId);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              this.userConnections.delete(connection.userId);
            }
          }
          
          this.connections.delete(socket.id);
        }
      });
    });
  }

  private async sendPendingNotifications(userId: string, socket: any) {
    try {
      const result = await getNotifications({ userId, read: false, limit: 5 });
      const unreadNotifications = result.notifications;
      if (unreadNotifications.length > 0) {
        socket.emit('pending-notifications', {
          count: unreadNotifications.length,
          notifications: unreadNotifications
        });
      }
    } catch (error) {
      console.error('❌ Failed to send pending notifications:', error);
    }
  }

  public async registerPushSubscription(
    userId: string, 
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<void> {
    const pushSub: PushSubscription = {
      id: uuidv4(),
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString()
    };

    this.subscriptions.set(pushSub.id, pushSub);
    await this.saveSubscriptions();
    
    console.log(`📱 Registered push subscription for user ${userId}`);
  }

  public async sendPushNotification(
    userId: string,
    notification: Notification,
    pushPayload?: Partial<PushNotificationPayload>
  ): Promise<void> {
    // Send via WebSocket if user is connected
    await this.sendWebSocketNotification(userId, notification);

    // Send via Web Push if user has subscriptions
    await this.sendWebPushNotification(userId, notification, pushPayload);
  }

  private async sendWebSocketNotification(userId: string, notification: Notification): Promise<void> {
    const userSockets = this.userConnections.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('new-notification', {
            notification,
            timestamp: new Date().toISOString()
          });
        }
      });
      console.log(`📱 Sent WebSocket notification to ${userSockets.size} connections for user ${userId}`);
    }
  }

  private async sendWebPushNotification(
    userId: string,
    notification: Notification,
    customPayload?: Partial<PushNotificationPayload>
  ): Promise<void> {
    const userSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);

    if (userSubscriptions.length === 0) {
      return;
    }

    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: '/icons/notification-icon-192.png',
      badge: '/icons/badge-icon-96.png',
      data: {
        notificationId: notification.id,
        type: notification.type,
        url: notification.actionUrl || '/',
        ...notification.data
      },
      requireInteraction: notification.priority === 'urgent',
      vibrate: this.getVibratePattern(notification.priority),
      ...customPayload
    };

    const promises = userSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        console.error(`❌ Failed to send push notification to ${subscription.id}:`, error);
        
        // Remove invalid subscriptions
        if (error instanceof Error && 'statusCode' in error) {
          const webPushError = error as any;
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            this.subscriptions.delete(subscription.id);
            await this.saveSubscriptions();
          }
        }
      }
    });

    await Promise.all(promises);
    console.log(`📱 Sent web push notifications to ${userSubscriptions.length} subscriptions for user ${userId}`);
  }

  private getVibratePattern(priority: NotificationPriority): number[] {
    switch (priority) {
      case 'urgent': return [200, 100, 200, 100, 200];
      case 'high': return [200, 100, 200];
      case 'normal': return [200];
      case 'low': return [];
      default: return [200];
    }
  }

  public async broadcastNotification(
    notification: Notification,
    targetUsers?: string[]
  ): Promise<void> {
    const users = targetUsers || Array.from(new Set([
      ...Array.from(this.connections.values()).map(conn => conn.userId),
      ...Array.from(this.subscriptions.values()).map(sub => sub.userId)
    ]));

    const promises = users.map(userId => 
      this.sendPushNotification(userId, notification)
    );

    await Promise.all(promises);
    console.log(`📢 Broadcasted notification to ${users.length} users`);
  }

  public async getVapidPublicKey(): Promise<string | null> {
    const keys = await this.loadVapidKeys();
    return keys ? keys.publicKey : null;
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  public getStats() {
    return {
      connectedSockets: this.connections.size,
      connectedUsers: this.userConnections.size,
      pushSubscriptions: this.subscriptions.size,
      connectionsByUser: Object.fromEntries(
        Array.from(this.userConnections.entries()).map(([userId, sockets]) => [userId, sockets.size])
      )
    };
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      const data = await fs.readFile(this.SUBSCRIPTIONS_FILE, 'utf-8');
      const subscriptions: PushSubscription[] = JSON.parse(data);
      subscriptions.forEach(sub => this.subscriptions.set(sub.id, sub));
      console.log(`📱 Loaded ${subscriptions.length} push subscriptions`);
    } catch {
      // File doesn't exist yet, that's OK
    }
  }

  private async saveSubscriptions(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.SUBSCRIPTIONS_FILE), { recursive: true });
      const subscriptions = Array.from(this.subscriptions.values());
      await fs.writeFile(this.SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    } catch (error) {
      console.error('❌ Failed to save subscriptions:', error);
    }
  }

  public async removePushSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription && subscription.userId === userId) {
      this.subscriptions.delete(subscriptionId);
      await this.saveSubscriptions();
      return true;
    }
    return false;
  }

  public async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => sub.userId === userId);
  }
}
