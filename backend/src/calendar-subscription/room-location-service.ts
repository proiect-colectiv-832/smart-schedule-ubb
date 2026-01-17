/**
 * Room Location Service
 * Maps room codes to physical addresses
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface RoomLocation {
  address: string;
}

export interface RoomLocationData {
  rooms: Record<string, RoomLocation>;
  metadata: {
    lastUpdated: string;
    version: string;
    notes?: string;
  };
}

// Cache for room locations
let roomLocationsCache: RoomLocationData | null = null;

/**
 * Load room locations from JSON file
 */
async function loadRoomLocations(): Promise<RoomLocationData> {
  if (roomLocationsCache) {
    return roomLocationsCache;
  }

  try {
    const filePath = path.join(__dirname, 'room-locations.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    roomLocationsCache = JSON.parse(fileContent);
    console.log(`📍 Room locations loaded: ${Object.keys(roomLocationsCache?.rooms || {}).length} rooms`);
    return roomLocationsCache!;
  } catch (error) {
    console.error('❌ Error loading room locations:', error);
    // Return empty structure as fallback
    return {
      rooms: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }
}

/**
 * Get location information for a specific room
 */
export async function getRoomLocation(roomCode: string): Promise<RoomLocation | null> {
  const data = await loadRoomLocations();

  // Try exact match first
  if (data.rooms[roomCode]) {
    return data.rooms[roomCode];
  }

  // Try case-insensitive match
  const roomCodeUpper = roomCode.toUpperCase();
  const matchingKey = Object.keys(data.rooms).find(
    key => key.toUpperCase() === roomCodeUpper
  );

  if (matchingKey) {
    return data.rooms[matchingKey];
  }

  // Room not found - this is not necessarily an error (could be intentional)
  return null;
}

/**
 * Format room location as a string for calendar location field
 * Returns the full address if available, otherwise the room code
 */
export async function formatRoomLocationForCalendar(roomCode: string): Promise<string> {
  const location = await getRoomLocation(roomCode);

  if (!location || !location.address) {
    // If room not found in database, return the room code itself
    // This ensures LOCATION is always populated in ICS
    return roomCode;
  }

  return location.address;
}

/**
 * Format room information for description/notes field
 * Format: "Room: [code]"
 */
export async function formatRoomInfoForDescription(roomCode: string): Promise<string> {
  // Simply return "Room: [code]" - the address is in the location field
  return `Room: ${roomCode}`;
}



/**
 * Check if a room exists in the database
 */
export async function roomExists(roomCode: string): Promise<boolean> {
  const location = await getRoomLocation(roomCode);
  return location !== null;
}

/**
 * Get all available rooms
 */
export async function getAllRooms(): Promise<string[]> {
  const data = await loadRoomLocations();
  return Object.keys(data.rooms);
}

/**
 * Reload room locations from file (useful for updates)
 */
export async function reloadRoomLocations(): Promise<void> {
  roomLocationsCache = null;
  await loadRoomLocations();
  console.log('📍 Room locations reloaded');
}

/**
 * Add or update a room location (and save to file)
 */
export async function updateRoomLocation(
  roomCode: string,
  location: RoomLocation
): Promise<void> {
  const data = await loadRoomLocations();
  data.rooms[roomCode] = location;
  data.metadata.lastUpdated = new Date().toISOString().split('T')[0];

  const filePath = path.join(__dirname, 'room-locations.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

  // Update cache
  roomLocationsCache = data;
  console.log(`📍 Room location updated: ${roomCode}`);
}

