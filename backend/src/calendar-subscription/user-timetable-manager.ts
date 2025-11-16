/**
 * User Timetable Manager
 * Manages personalized user timetables (scraped + custom events)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UserEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  type: 'lecture' | 'lab' | 'seminar' | 'custom';
  color?: string;
}

export interface RecurrenceRule {
  frequency: 'weekly' | 'biweekly' | 'oddweeks' | 'evenweeks';
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  until?: Date;
  count?: number;
}

export interface UserTimetable {
  userId: string;
  events: UserEvent[];
  lastModified: string;
  semesterStart?: Date;
  semesterEnd?: Date;
}

const TIMETABLES_DIR = path.join(__dirname, '../cache/user-timetables');
let timetablesCache: Map<string, UserTimetable> = new Map();

/**
 * Initialize the user timetable manager
 */
export async function initializeUserTimetableManager(): Promise<void> {
  try {
    await fs.mkdir(TIMETABLES_DIR, { recursive: true });

    // Load existing timetables
    const files = await fs.readdir(TIMETABLES_DIR);
    let loaded = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(TIMETABLES_DIR, file), 'utf-8');
          const timetable: UserTimetable = JSON.parse(data);

          // Parse date strings back to Date objects
          timetable.events = timetable.events.map(event => ({
            ...event,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            recurrenceRule: event.recurrenceRule ? {
              ...event.recurrenceRule,
              until: event.recurrenceRule.until ? new Date(event.recurrenceRule.until) : undefined,
            } : undefined,
          }));

          if (timetable.semesterStart) {
            timetable.semesterStart = new Date(timetable.semesterStart);
          }
          if (timetable.semesterEnd) {
            timetable.semesterEnd = new Date(timetable.semesterEnd);
          }

          timetablesCache.set(timetable.userId, timetable);
          loaded++;
        } catch (error) {
          console.error(`Error loading timetable ${file}:`, error);
        }
      }
    }

    console.log(`📅 Loaded ${loaded} user timetables`);
  } catch (error) {
    console.error('Error initializing user timetable manager:', error);
  }
}

/**
 * Save a user's timetable to disk
 */
async function saveTimetable(timetable: UserTimetable): Promise<void> {
  try {
    const filePath = path.join(TIMETABLES_DIR, `${timetable.userId}.json`);
    await fs.writeFile(filePath, JSON.stringify(timetable, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error saving timetable for user ${timetable.userId}:`, error);
    throw error;
  }
}

/**
 * Get a user's timetable
 */
export async function getUserTimetable(userId: string): Promise<UserTimetable | null> {
  return timetablesCache.get(userId) || null;
}

/**
 * Create or update a user's timetable
 */
export async function saveUserTimetable(userId: string, events: UserEvent[], semesterStart?: Date, semesterEnd?: Date): Promise<UserTimetable> {
  const timetable: UserTimetable = {
    userId,
    events,
    lastModified: new Date().toISOString(),
    semesterStart,
    semesterEnd,
  };

  timetablesCache.set(userId, timetable);
  await saveTimetable(timetable);

  return timetable;
}

/**
 * Add an event to a user's timetable
 */
export async function addUserEvent(userId: string, event: Omit<UserEvent, 'id'>): Promise<UserEvent> {
  let timetable = timetablesCache.get(userId);

  if (!timetable) {
    timetable = {
      userId,
      events: [],
      lastModified: new Date().toISOString(),
    };
  }

  const newEvent: UserEvent = {
    id: uuidv4(),
    ...event,
  };

  timetable.events.push(newEvent);
  timetable.lastModified = new Date().toISOString();

  timetablesCache.set(userId, timetable);
  await saveTimetable(timetable);

  return newEvent;
}

/**
 * Update an event in a user's timetable
 */
export async function updateUserEvent(userId: string, eventId: string, updates: Partial<UserEvent>): Promise<UserEvent | null> {
  const timetable = timetablesCache.get(userId);

  if (!timetable) {
    return null;
  }

  const eventIndex = timetable.events.findIndex(e => e.id === eventId);

  if (eventIndex === -1) {
    return null;
  }

  timetable.events[eventIndex] = {
    ...timetable.events[eventIndex],
    ...updates,
    id: eventId, // Ensure ID doesn't change
  };

  timetable.lastModified = new Date().toISOString();

  timetablesCache.set(userId, timetable);
  await saveTimetable(timetable);

  return timetable.events[eventIndex];
}

/**
 * Delete an event from a user's timetable
 */
export async function deleteUserEvent(userId: string, eventId: string): Promise<boolean> {
  const timetable = timetablesCache.get(userId);

  if (!timetable) {
    return false;
  }

  const initialLength = timetable.events.length;
  timetable.events = timetable.events.filter(e => e.id !== eventId);

  if (timetable.events.length === initialLength) {
    return false;
  }

  timetable.lastModified = new Date().toISOString();

  timetablesCache.set(userId, timetable);
  await saveTimetable(timetable);

  return true;
}

/**
 * Delete a user's entire timetable
 */
export async function deleteUserTimetable(userId: string): Promise<boolean> {
  const deleted = timetablesCache.delete(userId);

  if (deleted) {
    try {
      const filePath = path.join(TIMETABLES_DIR, `${userId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting timetable file for user ${userId}:`, error);
    }
  }

  return deleted;
}

/**
 * Get statistics about user timetables
 */
export function getUserTimetableStats() {
  let totalEvents = 0;
  let recurringEvents = 0;
  let customEvents = 0;

  // Convert Map.values() to Array to avoid downlevelIteration requirement
  for (const timetable of Array.from(timetablesCache.values())) {
    totalEvents += timetable.events.length;
    recurringEvents += timetable.events.filter(e => e.isRecurring).length;
    customEvents += timetable.events.filter(e => e.type === 'custom').length;
  }

  return {
    totalUsers: timetablesCache.size,
    totalEvents,
    recurringEvents,
    customEvents,
  };
}
