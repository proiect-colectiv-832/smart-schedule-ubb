/**
 * Timetable Comparison Job
 * Compares current scraped timetables with stored timetables
 * and creates notifications when changes are detected.
 */

import { 
  getAllUserTimetables, 
  getUserTimetable as getUserTimetableDB,
  UserTimetableDocument,
  UserTimetableEntry
} from '../database/user-timetable-db';
import { 
  createNotification 
} from '../notifications/notification-manager';
import { 
  NotificationType, 
  NotificationPriority 
} from '../notifications/notification-types';
import * as crypto from 'crypto';

// Store previous timetable hashes to detect changes
// Map<userId, hash>
const previousTimetableHashes: Map<string, string> = new Map();

/**
 * Interface for timetable change details
 */
export interface TimetableChange {
  type: 'added' | 'removed' | 'modified';
  entry: UserTimetableEntry;
  previousEntry?: UserTimetableEntry;
  changeDetails?: string;
}

/**
 * Interface for comparison result
 */
export interface ComparisonResult {
  userId: string;
  hasChanges: boolean;
  changes: TimetableChange[];
  newHash: string;
  previousHash?: string;
}

/**
 * Creates a hash from timetable entries for quick comparison
 */
function createTimetableEntriesHash(entries: UserTimetableEntry[]): string {
  const hash = crypto.createHash('sha256');
  
  // Sort entries for consistent hashing
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.day !== b.day) return a.day.localeCompare(b.day);
    if (a.interval.start.hour !== b.interval.start.hour) {
      return a.interval.start.hour - b.interval.start.hour;
    }
    return a.subjectName.localeCompare(b.subjectName);
  });
  
  // Create a normalized representation
  const normalized = sortedEntries.map(entry => ({
    day: entry.day,
    start: `${entry.interval.start.hour}:${entry.interval.start.minute}`,
    end: `${entry.interval.end.hour}:${entry.interval.end.minute}`,
    subject: entry.subjectName,
    teacher: entry.teacher,
    room: entry.room,
    type: entry.type,
    frequency: entry.frequency,
  }));
  
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

/**
 * Creates a unique key for a timetable entry (for comparison)
 */
function createEntryKey(entry: UserTimetableEntry): string {
  return `${entry.day}-${entry.interval.start.hour}:${entry.interval.start.minute}-${entry.subjectName}`;
}

/**
 * Compares two timetable entries and returns the differences
 */
function compareEntries(oldEntry: UserTimetableEntry, newEntry: UserTimetableEntry): string[] {
  const differences: string[] = [];
  
  if (oldEntry.room !== newEntry.room) {
    differences.push(`Sala: ${oldEntry.room} → ${newEntry.room}`);
  }
  if (oldEntry.teacher !== newEntry.teacher) {
    differences.push(`Profesor: ${oldEntry.teacher} → ${newEntry.teacher}`);
  }
  if (oldEntry.interval.start.hour !== newEntry.interval.start.hour || 
      oldEntry.interval.start.minute !== newEntry.interval.start.minute) {
    differences.push(`Ora început: ${oldEntry.interval.start.hour}:${String(oldEntry.interval.start.minute).padStart(2, '0')} → ${newEntry.interval.start.hour}:${String(newEntry.interval.start.minute).padStart(2, '0')}`);
  }
  if (oldEntry.interval.end.hour !== newEntry.interval.end.hour || 
      oldEntry.interval.end.minute !== newEntry.interval.end.minute) {
    differences.push(`Ora sfârșit: ${oldEntry.interval.end.hour}:${String(oldEntry.interval.end.minute).padStart(2, '0')} → ${newEntry.interval.end.hour}:${String(newEntry.interval.end.minute).padStart(2, '0')}`);
  }
  if (oldEntry.frequency !== newEntry.frequency) {
    differences.push(`Frecvență: ${oldEntry.frequency} → ${newEntry.frequency}`);
  }
  if (oldEntry.type !== newEntry.type) {
    differences.push(`Tip: ${oldEntry.type} → ${newEntry.type}`);
  }
  
  return differences;
}

/**
 * Compares old and new timetable entries to find changes
 */
function findTimetableChanges(
  oldEntries: UserTimetableEntry[], 
  newEntries: UserTimetableEntry[]
): TimetableChange[] {
  const changes: TimetableChange[] = [];
  
  // Create maps for easy lookup
  const oldEntriesMap = new Map<string, UserTimetableEntry>();
  const newEntriesMap = new Map<string, UserTimetableEntry>();
  
  oldEntries.forEach(entry => {
    oldEntriesMap.set(createEntryKey(entry), entry);
  });
  
  newEntries.forEach(entry => {
    newEntriesMap.set(createEntryKey(entry), entry);
  });
  
  // Find removed entries
  for (const [key, oldEntry] of oldEntriesMap) {
    if (!newEntriesMap.has(key)) {
      changes.push({
        type: 'removed',
        entry: oldEntry,
        changeDetails: `Eliminat: ${oldEntry.subjectName} - ${oldEntry.day} ${oldEntry.interval.start.hour}:${String(oldEntry.interval.start.minute).padStart(2, '0')}`
      });
    }
  }
  
  // Find added entries
  for (const [key, newEntry] of newEntriesMap) {
    if (!oldEntriesMap.has(key)) {
      changes.push({
        type: 'added',
        entry: newEntry,
        changeDetails: `Adăugat: ${newEntry.subjectName} - ${newEntry.day} ${newEntry.interval.start.hour}:${String(newEntry.interval.start.minute).padStart(2, '0')}`
      });
    }
  }
  
  // Find modified entries (same key but different content)
  for (const [key, newEntry] of newEntriesMap) {
    const oldEntry = oldEntriesMap.get(key);
    if (oldEntry) {
      const differences = compareEntries(oldEntry, newEntry);
      if (differences.length > 0) {
        changes.push({
          type: 'modified',
          entry: newEntry,
          previousEntry: oldEntry,
          changeDetails: `Modificat ${newEntry.subjectName}: ${differences.join(', ')}`
        });
      }
    }
  }
  
  return changes;
}

/**
 * Compares a user's current timetable with the previously stored one
 */
export async function compareUserTimetable(userId: string): Promise<ComparisonResult> {
  const timetable = await getUserTimetableDB(userId);
  
  if (!timetable || !timetable.entries) {
    return {
      userId,
      hasChanges: false,
      changes: [],
      newHash: '',
      previousHash: previousTimetableHashes.get(userId),
    };
  }
  
  const newHash = createTimetableEntriesHash(timetable.entries);
  const previousHash = previousTimetableHashes.get(userId);
  
  // If no previous hash exists, this is the first comparison
  if (!previousHash) {
    previousTimetableHashes.set(userId, newHash);
    return {
      userId,
      hasChanges: false,
      changes: [],
      newHash,
      previousHash: undefined,
    };
  }
  
  // Quick check: if hashes are the same, no changes
  if (newHash === previousHash) {
    return {
      userId,
      hasChanges: false,
      changes: [],
      newHash,
      previousHash,
    };
  }
  
  // Hashes differ - find specific changes
  // Note: We need the old entries to compare. For now, we'll indicate there are changes
  // without detailed comparison since we only store the hash.
  // For detailed changes, we'd need to store the previous entries too.
  
  previousTimetableHashes.set(userId, newHash);
  
  return {
    userId,
    hasChanges: true,
    changes: [], // Would need stored entries for detailed changes
    newHash,
    previousHash,
  };
}

/**
 * Creates a schedule change notification for a user
 */
async function createScheduleChangeNotificationForUser(
  userId: string,
  changes: TimetableChange[]
): Promise<void> {
  const changeCount = changes.length;
  
  let title = '📅 Orarul tău a fost modificat';
  let message = '';
  
  if (changeCount === 1) {
    message = changes[0].changeDetails || 'O modificare a fost detectată în orarul tău.';
  } else if (changeCount <= 3) {
    message = changes.map(c => c.changeDetails).filter(Boolean).join('\n');
  } else {
    message = `Au fost detectate ${changeCount} modificări în orarul tău. Verifică aplicația pentru detalii.`;
  }
  
  // Determine notification type based on changes
  let notificationType = NotificationType.SCHEDULE_CHANGE;
  const hasRoomChange = changes.some(c => c.changeDetails?.includes('Sala'));
  const hasTimeChange = changes.some(c => c.changeDetails?.includes('Ora'));
  const hasRemoved = changes.some(c => c.type === 'removed');
  
  if (hasRemoved) {
    notificationType = NotificationType.COURSE_CANCELLED;
  } else if (hasRoomChange) {
    notificationType = NotificationType.ROOM_CHANGE;
  } else if (hasTimeChange) {
    notificationType = NotificationType.TIME_CHANGE;
  }
  
  await createNotification({
    userId,
    type: notificationType,
    title,
    message,
    priority: hasRemoved ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
    data: {
      changesCount: changeCount,
      changes: changes.slice(0, 5).map(c => ({
        type: c.type,
        details: c.changeDetails,
        subject: c.entry.subjectName,
      })),
    },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
  });
  
  console.log(`📢 Created schedule change notification for user ${userId} with ${changeCount} changes`);
}

/**
 * Storage for previous timetable entries (for detailed comparison)
 */
const previousTimetableEntries: Map<string, UserTimetableEntry[]> = new Map();

/**
 * Compares timetables for all users and creates notifications for changes
 * This is the main function to be called by the cron job
 */
export async function compareTimetablesForAllUsers(): Promise<{
  usersChecked: number;
  usersWithChanges: number;
  notificationsCreated: number;
  errors: string[];
}> {
  console.log('🔄 Starting daily timetable comparison...');
  
  const result = {
    usersChecked: 0,
    usersWithChanges: 0,
    notificationsCreated: 0,
    errors: [] as string[],
  };
  
  try {
    const allTimetables = await getAllUserTimetables();
    result.usersChecked = allTimetables.length;
    
    console.log(`📊 Checking ${allTimetables.length} user timetables...`);
    
    for (const timetable of allTimetables) {
      try {
        const userId = timetable.userId;
        const currentEntries = timetable.entries;
        const currentHash = createTimetableEntriesHash(currentEntries);
        
        const previousHash = previousTimetableHashes.get(userId);
        const previousEntries = previousTimetableEntries.get(userId);
        
        // First time seeing this user - just store their data
        if (!previousHash || !previousEntries) {
          previousTimetableHashes.set(userId, currentHash);
          previousTimetableEntries.set(userId, [...currentEntries]);
          continue;
        }
        
        // Check if hash changed
        if (currentHash !== previousHash) {
          // Find specific changes
          const changes = findTimetableChanges(previousEntries, currentEntries);
          
          if (changes.length > 0) {
            result.usersWithChanges++;
            
            // Create notification
            await createScheduleChangeNotificationForUser(userId, changes);
            result.notificationsCreated++;
          }
          
          // Update stored data
          previousTimetableHashes.set(userId, currentHash);
          previousTimetableEntries.set(userId, [...currentEntries]);
        }
        
      } catch (error) {
        const errorMsg = `Error comparing timetable for user ${timetable.userId}: ${error instanceof Error ? error.message : error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Timetable comparison completed:`);
    console.log(`   - Users checked: ${result.usersChecked}`);
    console.log(`   - Users with changes: ${result.usersWithChanges}`);
    console.log(`   - Notifications created: ${result.notificationsCreated}`);
    
  } catch (error) {
    const errorMsg = `Fatal error in timetable comparison: ${error instanceof Error ? error.message : error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
}

/**
 * Initialize the comparison job by loading current timetables as baseline
 * Should be called when the server starts
 */
export async function initializeTimetableComparison(): Promise<void> {
  console.log('🔄 Initializing timetable comparison baseline...');
  
  try {
    const allTimetables = await getAllUserTimetables();
    
    for (const timetable of allTimetables) {
      const hash = createTimetableEntriesHash(timetable.entries);
      previousTimetableHashes.set(timetable.userId, hash);
      previousTimetableEntries.set(timetable.userId, [...timetable.entries]);
    }
    
    console.log(`✅ Loaded baseline for ${allTimetables.length} user timetables`);
  } catch (error) {
    console.error('⚠️  Error initializing timetable comparison:', error);
  }
}

/**
 * Check if a specific user has timetable changes
 * This can be called on-demand when user opens the app
 */
export async function checkUserTimetableChanges(userId: string): Promise<{
  hasChanges: boolean;
  changes: TimetableChange[];
  lastChecked: string;
}> {
  const timetable = await getUserTimetableDB(userId);
  
  if (!timetable || !timetable.entries) {
    return {
      hasChanges: false,
      changes: [],
      lastChecked: new Date().toISOString(),
    };
  }
  
  const currentEntries = timetable.entries;
  const currentHash = createTimetableEntriesHash(currentEntries);
  
  const previousHash = previousTimetableHashes.get(userId);
  const previousEntries = previousTimetableEntries.get(userId);
  
  // First time - store baseline
  if (!previousHash || !previousEntries) {
    previousTimetableHashes.set(userId, currentHash);
    previousTimetableEntries.set(userId, [...currentEntries]);
    return {
      hasChanges: false,
      changes: [],
      lastChecked: new Date().toISOString(),
    };
  }
  
  // Check for changes
  if (currentHash !== previousHash) {
    const changes = findTimetableChanges(previousEntries, currentEntries);
    
    // Update baseline after checking
    previousTimetableHashes.set(userId, currentHash);
    previousTimetableEntries.set(userId, [...currentEntries]);
    
    return {
      hasChanges: changes.length > 0,
      changes,
      lastChecked: new Date().toISOString(),
    };
  }
  
  return {
    hasChanges: false,
    changes: [],
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Get comparison statistics
 */
export function getTimetableComparisonStats(): {
  usersTracked: number;
  hashesStored: number;
} {
  return {
    usersTracked: previousTimetableEntries.size,
    hashesStored: previousTimetableHashes.size,
  };
}
