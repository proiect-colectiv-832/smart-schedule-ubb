import fs from 'fs/promises';
import path from 'path';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  CreateNotificationRequest, 
  NotificationQuery,
  NotificationStats 
} from './notification-types';

const NOTIFICATIONS_DIR = path.join(__dirname, '..', 'data', 'notifications');
const NOTIFICATIONS_FILE = path.join(NOTIFICATIONS_DIR, 'notifications.json');

// In-memory storage for better performance (you can replace with database later)
let notificationsCache: Notification[] = [];
let isLoaded = false;

async function ensureNotificationsDir(): Promise<void> {
  try {
    await fs.access(NOTIFICATIONS_DIR);
  } catch (err) {
    await fs.mkdir(NOTIFICATIONS_DIR, { recursive: true });
  }
}

async function loadNotifications(): Promise<void> {
  if (isLoaded) return;
  
  try {
    await ensureNotificationsDir();
    const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
    notificationsCache = JSON.parse(data);
    console.log(`📢 Loaded ${notificationsCache.length} notifications from file`);
  } catch (err) {
    // File doesn't exist or is empty, start with empty array
    notificationsCache = [];
    console.log('📢 Starting with empty notifications cache');
  }
  
  isLoaded = true;
}

async function saveNotifications(): Promise<void> {
  await ensureNotificationsDir();
  await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notificationsCache, null, 2), 'utf-8');
}

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function createNotification(request: CreateNotificationRequest): Promise<Notification> {
  await loadNotifications();
  
  const notification: Notification = {
    id: generateId(),
    userId: request.userId,
    type: request.type,
    title: request.title,
    message: request.message,
    data: request.data || {},
    read: false,
    priority: request.priority || NotificationPriority.NORMAL,
    createdAt: new Date().toISOString(),
    expiresAt: request.expiresAt,
    actionUrl: request.actionUrl,
    actionText: request.actionText
  };
  
  notificationsCache.push(notification);
  await saveNotifications();
  
  console.log(`📢 Created notification: ${notification.type} for user ${notification.userId}`);
  return notification;
}

export async function getNotifications(query: NotificationQuery = {}): Promise<{
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}> {
  await loadNotifications();
  
  let filtered = [...notificationsCache];
  
  // Apply filters
  if (query.userId) {
    filtered = filtered.filter(n => n.userId === query.userId);
  }
  
  if (query.type) {
    filtered = filtered.filter(n => n.type === query.type);
  }
  
  if (query.read !== undefined) {
    filtered = filtered.filter(n => n.read === query.read);
  }
  
  if (query.priority) {
    filtered = filtered.filter(n => n.priority === query.priority);
  }
  
  if (query.since) {
    filtered = filtered.filter(n => n.createdAt >= query.since!);
  }
  
  // Remove expired notifications
  const now = new Date().toISOString();
  filtered = filtered.filter(n => !n.expiresAt || n.expiresAt > now);
  
  // Sort by creation date (newest first) and priority
  filtered.sort((a, b) => {
    // First sort by priority (urgent > high > normal > low)
    const priorityOrder = {
      [NotificationPriority.URGENT]: 4,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.NORMAL]: 2,
      [NotificationPriority.LOW]: 1
    };
    
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const total = filtered.length;
  const offset = query.offset || 0;
  const limit = query.limit || 50;
  
  const notifications = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < total;
  
  return { notifications, total, hasMore };
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  await loadNotifications();
  return notificationsCache.find(n => n.id === id) || null;
}

export async function markAsRead(id: string): Promise<boolean> {
  await loadNotifications();
  
  const notification = notificationsCache.find(n => n.id === id);
  if (!notification) return false;
  
  notification.read = true;
  await saveNotifications();
  
  console.log(`📖 Marked notification ${id} as read`);
  return true;
}

export async function markAllAsRead(userId: string): Promise<number> {
  await loadNotifications();
  
  let count = 0;
  notificationsCache.forEach(notification => {
    if (notification.userId === userId && !notification.read) {
      notification.read = true;
      count++;
    }
  });
  
  if (count > 0) {
    await saveNotifications();
    console.log(`📖 Marked ${count} notifications as read for user ${userId}`);
  }
  
  return count;
}

export async function deleteNotification(id: string): Promise<boolean> {
  await loadNotifications();
  
  const index = notificationsCache.findIndex(n => n.id === id);
  if (index === -1) return false;
  
  notificationsCache.splice(index, 1);
  await saveNotifications();
  
  console.log(`🗑️ Deleted notification ${id}`);
  return true;
}

export async function deleteExpiredNotifications(): Promise<number> {
  await loadNotifications();
  
  const now = new Date().toISOString();
  const initialCount = notificationsCache.length;
  
  notificationsCache = notificationsCache.filter(n => !n.expiresAt || n.expiresAt > now);
  
  const deletedCount = initialCount - notificationsCache.length;
  
  if (deletedCount > 0) {
    await saveNotifications();
    console.log(`🧹 Deleted ${deletedCount} expired notifications`);
  }
  
  return deletedCount;
}

export async function getNotificationStats(userId?: string): Promise<NotificationStats> {
  await loadNotifications();
  
  let filtered = notificationsCache;
  if (userId) {
    filtered = filtered.filter(n => n.userId === userId);
  }
  
  // Remove expired notifications from stats
  const now = new Date().toISOString();
  filtered = filtered.filter(n => !n.expiresAt || n.expiresAt > now);
  
  const total = filtered.length;
  const unread = filtered.filter(n => !n.read).length;
  
  const byType: Record<NotificationType, number> = {} as any;
  const byPriority: Record<NotificationPriority, number> = {} as any;
  
  // Initialize counters
  Object.values(NotificationType).forEach(type => {
    byType[type] = 0;
  });
  Object.values(NotificationPriority).forEach(priority => {
    byPriority[priority] = 0;
  });
  
  // Count notifications
  filtered.forEach(notification => {
    byType[notification.type]++;
    byPriority[notification.priority]++;
  });
  
  return { total, unread, byType, byPriority };
}

// Utility function to create schedule change notifications
export async function createScheduleChangeNotification(
  userId: string,
  changeType: 'room' | 'time' | 'teacher' | 'cancelled',
  subject: string,
  oldValue: string,
  newValue: string,
  date: string
): Promise<Notification> {
  const typeMap = {
    room: NotificationType.ROOM_CHANGE,
    time: NotificationType.TIME_CHANGE,
    teacher: NotificationType.TEACHER_CHANGE,
    cancelled: NotificationType.COURSE_CANCELLED
  };
  
  const titleMap = {
    room: 'Room Changed',
    time: 'Time Changed',
    teacher: 'Teacher Changed',
    cancelled: 'Course Cancelled'
  };
  
  const messageMap = {
    room: `${subject} room changed from ${oldValue} to ${newValue} on ${date}`,
    time: `${subject} time changed from ${oldValue} to ${newValue} on ${date}`,
    teacher: `${subject} teacher changed from ${oldValue} to ${newValue} on ${date}`,
    cancelled: `${subject} has been cancelled on ${date}`
  };
  
  return createNotification({
    userId,
    type: typeMap[changeType],
    title: titleMap[changeType],
    message: messageMap[changeType],
    priority: changeType === 'cancelled' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
    data: {
      subject,
      changeType,
      oldValue,
      newValue,
      date
    }
  });
}

// Background task to clean up expired notifications (run periodically)
export async function cleanupExpiredNotifications(): Promise<void> {
  await deleteExpiredNotifications();
}
