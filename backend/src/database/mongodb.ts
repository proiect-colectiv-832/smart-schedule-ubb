import { MongoClient, Db, MongoClientOptions } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * MongoDB connection configuration
 */
export interface MongoDBConfig {
  connectionString: string;
  databaseName: string;
  options?: MongoClientOptions;
}

/**
 * Connect to MongoDB cluster
 * @param config MongoDB configuration
 * @returns Database instance
 */
export async function connectToMongoDB(config: MongoDBConfig): Promise<Db> {
  try {
    // Close existing connection if any
    if (client) {
      await client.close();
    }

    // Create new MongoDB client
    client = new MongoClient(config.connectionString, {
      ...config.options,
      // Recommended options for production
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Connect to the cluster
    await client.connect();

    // Get database instance
    db = client.db(config.databaseName);

    // Test the connection
    await db.admin().ping();

    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get the current database instance
 * @returns Database instance or null if not connected
 */
export function getDatabase(): Db | null {
  return db;
}

/**
 * Get the MongoDB client instance
 * @returns MongoClient instance or null if not connected
 */
export function getClient(): MongoClient | null {
  return client;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDBConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * Check if MongoDB is connected
 * @returns true if connected, false otherwise
 */
export async function isConnected(): Promise<boolean> {
  try {
    if (!db) {
      return false;
    }
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize MongoDB connection from environment variables
 * Uses MONGODB_URI and MONGODB_DB_NAME environment variables
 */
export async function initializeMongoDB(): Promise<Db> {
  const connectionString = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB_NAME || 'smart-schedule';

  if (!connectionString) {
    throw new Error(
      'MONGODB_URI environment variable is required. ' +
      'Please set it in your .env file or environment variables.'
    );
  }

  return connectToMongoDB({
    connectionString,
    databaseName,
  });
}


