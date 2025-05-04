import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage
const storage = new MMKV();

// --- Constants ---
const DEFAULT_TTL_MS = 5 * 60 * 1000; // Default 5 minutes TTL

// Define prefixes for different cache types
export const CachePrefix = {
  USER_PROFILE: 'cache:userProfile:',
  SEARCH_HISTORY: 'cache:searchHistory', // Usually a single key
  WINE_DETAILS: 'cache:wine:',
  WINE_NOTES: 'cache:notes:',
  WINE_OFFERS: 'cache:offers:',
  WINE_INTERACTIONS: 'cache:interactions:',
  CHAT_MESSAGES: 'cache:chat:',
  NOTE_DRAFT: 'cache:noteDraft:',
};

// --- Types ---
interface CachedItem<T> {
  timestamp: number;
  data: T;
}

// --- Helper Functions ---

/**
 * Generates a cache key using a prefix and an optional ID.
 * @param prefix - Cache prefix from CachePrefix enum.
 * @param id - Optional unique identifier (e.g., userId, wineId).
 * @returns The generated cache key.
 */
const generateKey = (prefix: string, id?: string | number): string => {
  return id ? `${prefix}${id}` : prefix;
};

/**
 * Checks if a cached item is still valid based on its timestamp and TTL.
 * @param timestamp - The timestamp when the item was cached.
 * @param ttlMs - Time-To-Live in milliseconds.
 * @returns True if the item is still valid, false otherwise.
 */
const isCacheValid = (timestamp: number, ttlMs: number = DEFAULT_TTL_MS): boolean => {
  const now = Date.now();
  return now - timestamp < ttlMs;
};

// --- Core Cache Functions ---

/**
 * Sets a value in the MMKV cache with a timestamp.
 * Handles objects by stringifying them.
 * @param key - The cache key.
 * @param value - The value to store (can be any type).
 */
const set = <T>(key: string, value: T): void => {
  try {
    const item: CachedItem<T> = {
      timestamp: Date.now(),
      data: value,
    };
    storage.set(key, JSON.stringify(item));
    console.log(`[CacheService] Set key: ${key}`);
  } catch (error) {
    console.error(`[CacheService] Error setting key ${key}:`, error);
  }
};

/**
 * Gets a value from the MMKV cache.
 * Handles objects by parsing them.
 * Checks TTL validity before returning data.
 * @param key - The cache key.
 * @param ttlMs - Optional TTL in milliseconds (defaults to DEFAULT_TTL_MS).
 * @returns The cached data if valid and found, otherwise null.
 */
const get = <T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null => {
  try {
    const jsonString = storage.getString(key);
    if (jsonString) {
      const item: CachedItem<T> = JSON.parse(jsonString);
      if (isCacheValid(item.timestamp, ttlMs)) {
        console.log(`[CacheService] Cache hit for key: ${key}`);
        return item.data;
      } else {
        console.log(`[CacheService] Cache expired for key: ${key}`);
        // Optionally delete expired cache item
        storage.delete(key);
        return null;
      }
    }
    console.log(`[CacheService] Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`[CacheService] Error getting key ${key}:`, error);
    // Optionally delete corrupted cache item
    try {
      storage.delete(key);
    } catch (deleteError) {
      // Ignore delete error if key doesn't exist or fails
    }
    return null;
  }
};

/**
 * Deletes an item from the MMKV cache.
 * @param key - The cache key to delete.
 */
const deleteItem = (key: string): void => {
  try {
    storage.delete(key);
    console.log(`[CacheService] Deleted key: ${key}`);
  } catch (error) {
    console.error(`[CacheService] Error deleting key ${key}:`, error);
  }
};

/**
 * Clears the entire MMKV cache. Use with caution (e.g., on logout).
 */
const clearAll = (): void => {
  try {
    storage.clearAll();
    console.log('[CacheService] Cache cleared.');
  } catch (error) {
    console.error('[CacheService] Error clearing cache:', error);
  }
};

// --- Export Service ---

export const cacheService = {
  generateKey,
  set,
  get,
  deleteItem,
  clearAll,
  // Expose prefixes if needed externally, though generateKey is preferred
  // prefixes: CachePrefix
};

// Example Usage (can be removed):
/*
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const userId = 'user123';
const profileKey = cacheService.generateKey(CachePrefix.USER_PROFILE, userId);

// Set profile
const userProfileData: UserProfile = { id: userId, name: 'John Doe', email: 'john@example.com'};
cacheService.set<UserProfile>(profileKey, userProfileData);

// Get profile (within TTL)
const cachedProfile = cacheService.get<UserProfile>(profileKey);
if (cachedProfile) {
  console.log('Cached Profile:', cachedProfile);
}

// Get profile (after TTL might return null)
// setTimeout(() => {
//   const maybeExpiredProfile = cacheService.get<UserProfile>(profileKey, 100); // Use short TTL for testing
//   console.log('Maybe Expired Profile:', maybeExpiredProfile);
// }, 200);

// Delete profile
// cacheService.deleteItem(profileKey);

// Clear all on logout
// cacheService.clearAll();
*/ 