/**
 * Calendar Token Manager
 * Manages secure tokens for user calendar subscriptions
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CalendarToken {
  userId: string;
  token: string;
  createdAt: string;
  lastAccessedAt: string;
}

const TOKENS_FILE = path.join(__dirname, '../cache/calendar-tokens.json');

let tokensCache: Map<string, CalendarToken> = new Map();

/**
 * Initialize the token manager by loading existing tokens
 */
export async function initializeTokenManager(): Promise<void> {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf-8');
    const tokens: CalendarToken[] = JSON.parse(data);
    tokensCache = new Map(tokens.map(t => [t.token, t]));
    console.log(`📅 Loaded ${tokensCache.size} calendar tokens`);
  } catch (error) {
    // File doesn't exist yet, start fresh
    tokensCache = new Map();
    console.log('📅 Initialized empty calendar tokens cache');
  }
}

/**
 * Save tokens to disk
 */
async function saveTokens(): Promise<void> {
  try {
    const tokens = Array.from(tokensCache.values());
    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving calendar tokens:', error);
  }
}

/**
 * Generate a new calendar token for a user
 * @param userId - The user ID
 * @returns The generated token
 */
export async function generateCalendarToken(userId: string): Promise<string> {
  // Check if user already has a token
  for (const [token, data] of tokensCache.entries()) {
    if (data.userId === userId) {
      return token;
    }
  }

  // Generate new token
  const token = uuidv4();
  const calendarToken: CalendarToken = {
    userId,
    token,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  };

  tokensCache.set(token, calendarToken);
  await saveTokens();

  return token;
}

/**
 * Get user ID from a calendar token
 * @param token - The calendar token
 * @returns The user ID or null if token is invalid
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const tokenData = tokensCache.get(token);
  
  if (!tokenData) {
    return null;
  }

  // Update last accessed time
  tokenData.lastAccessedAt = new Date().toISOString();
  tokensCache.set(token, tokenData);
  await saveTokens();

  return tokenData.userId;
}

/**
 * Revoke a calendar token
 * @param token - The token to revoke
 * @returns True if revoked successfully
 */
export async function revokeCalendarToken(token: string): Promise<boolean> {
  const deleted = tokensCache.delete(token);
  if (deleted) {
    await saveTokens();
  }
  return deleted;
}

/**
 * Revoke all tokens for a specific user
 * @param userId - The user ID
 * @returns Number of tokens revoked
 */
export async function revokeUserTokens(userId: string): Promise<number> {
  let count = 0;
  for (const [token, data] of tokensCache.entries()) {
    if (data.userId === userId) {
      tokensCache.delete(token);
      count++;
    }
  }
  
  if (count > 0) {
    await saveTokens();
  }
  
  return count;
}

/**
 * Get all tokens for a user
 * @param userId - The user ID
 * @returns Array of tokens for the user
 */
export function getUserTokens(userId: string): CalendarToken[] {
  const tokens: CalendarToken[] = [];
  for (const tokenData of tokensCache.values()) {
    if (tokenData.userId === userId) {
      tokens.push(tokenData);
    }
  }
  return tokens;
}

/**
 * Get statistics about calendar tokens
 */
export function getTokenStats() {
  const users = new Set<string>();
  for (const data of tokensCache.values()) {
    users.add(data.userId);
  }

  return {
    totalTokens: tokensCache.size,
    uniqueUsers: users.size,
  };
}

