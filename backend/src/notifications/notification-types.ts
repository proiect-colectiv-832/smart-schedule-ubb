export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  priority: NotificationPriority;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
}

export enum NotificationType {
  SCHEDULE_CHANGE = 'schedule_change',
  NEW_COURSE = 'new_course',
  COURSE_CANCELLED = 'course_cancelled',
  ROOM_CHANGE = 'room_change',
  TIME_CHANGE = 'time_change',
  TEACHER_CHANGE = 'teacher_change',
  REMINDER = 'reminder',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
}

export interface NotificationQuery {
  userId?: string;
  type?: NotificationType;
  read?: boolean;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
  since?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}
