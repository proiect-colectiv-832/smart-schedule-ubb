import { getDatabase } from './mongodb';
import { Collection, Document } from 'mongodb';

/**
 * User Timetable Entry interface matching frontend structure
 */
export interface UserTimetableEntry {
  id: number;
  day: number; // enum index: 0=Monday, 1=Tuesday, etc.
  sh: number; // start hour
  sm: number; // start minute
  eh: number; // end hour
  em: number; // end minute
  subject: string;
  teacher: string;
  freq: number; // frequency enum index: 0=weekly, 1=oddweeks, 2=evenweeks
  type: number; // type enum index: 0=lecture, 1=seminar, 2=lab, 3=other
  room: string;
  format: string;
}

/**
 * User Timetable Document stored in MongoDB
 */
export interface UserTimetableDocument extends Document {
  userId: string;
  entries: UserTimetableEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = 'user-timetables';

/**
 * Get user timetables collection
 */
function getUserTimetablesCollection(): Collection<UserTimetableDocument> {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database not connected. Please ensure MongoDB is initialized.');
  }
  return db.collection<UserTimetableDocument>(COLLECTION_NAME);
}

/**
 * Save or update user timetable
 * @param userId - User ID
 * @param entries - Array of timetable entries
 * @returns The saved/updated timetable document
 */
export async function saveUserTimetable(
  userId: string,
  entries: UserTimetableEntry[]
): Promise<UserTimetableDocument> {
  const collection = getUserTimetablesCollection();
  
  const now = new Date();
  const document: Omit<UserTimetableDocument, '_id'> = {
    userId,
    entries,
    createdAt: now,
    updatedAt: now,
  };

  // Use upsert to create if doesn't exist, update if exists
  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $set: {
        entries,
        updatedAt: now,
      },
      $setOnInsert: {
        userId,
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  if (!result) {
    throw new Error('Failed to save user timetable');
  }

  return result;
}

/**
 * Get user timetable by userId
 * @param userId - User ID
 * @returns User timetable document or null if not found
 */
export async function getUserTimetable(
  userId: string
): Promise<UserTimetableDocument | null> {
  const collection = getUserTimetablesCollection();
  return await collection.findOne({ userId });
}

/**
 * Delete user timetable
 * @param userId - User ID
 * @returns true if deleted, false if not found
 */
export async function deleteUserTimetable(userId: string): Promise<boolean> {
  const collection = getUserTimetablesCollection();
  const result = await collection.deleteOne({ userId });
  return result.deletedCount > 0;
}

/**
 * Get all user timetables (for admin/debugging)
 * @returns Array of all user timetable documents
 */
export async function getAllUserTimetables(): Promise<UserTimetableDocument[]> {
  const collection = getUserTimetablesCollection();
  return await collection.find({}).toArray();
}

/**
 * Get statistics about user timetables
 */
export async function getUserTimetableStats(): Promise<{
  totalUsers: number;
  totalEntries: number;
  averageEntriesPerUser: number;
}> {
  const collection = getUserTimetablesCollection();
  
  const allTimetables = await collection.find({}).toArray();
  const totalUsers = allTimetables.length;
  const totalEntries = allTimetables.reduce(
    (sum, tt) => sum + tt.entries.length,
    0
  );
  const averageEntriesPerUser = totalUsers > 0 ? totalEntries / totalUsers : 0;

  return {
    totalUsers,
    totalEntries,
    averageEntriesPerUser: Math.round(averageEntriesPerUser * 100) / 100,
  };
}

/**
 * Create indexes for the collection (should be called on initialization)
 */
export async function createUserTimetableIndexes(): Promise<void> {
  const collection = getUserTimetablesCollection();
  
  // Create unique index on userId for fast lookups
  await collection.createIndex({ userId: 1 }, { unique: true });
  
  // Create index on updatedAt for sorting/filtering
  await collection.createIndex({ updatedAt: -1 });
  
  console.log('✅ User timetable indexes created');
}

