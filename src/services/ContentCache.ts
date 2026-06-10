
import { CacheEntry } from '../types';

/**
 * ContentCache Service
 * 
 * This service implements a "Stale-While-Revalidate" strategy (simplified) using LocalStorage.
 * It prevents the app from constantly hitting the AI API for the same content,
 * which is critical for the "Data Costs" constraint in Lesotho.
 */

const CACHE_PREFIX = 'motlatsi_cache_';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days expiry

export const ContentCache = {
    /**
     * Save content to cache
     */
    set: <T>(key: string, data: T): void => {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: 1
        };
        try {
            localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
        } catch (e) {
            console.warn('Cache quota exceeded, clearing old items...');
            localStorage.clear(); // Nuclear option for prototype, in prod use LRU
            try {
                localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
            } catch (e2) {
                console.error('Failed to cache even after clear');
            }
        }
    },

    /**
     * Get content from cache
     */
    get: <T>(key: string): T | null => {
        const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!item) return null;

        try {
            const entry: CacheEntry<T> = JSON.parse(item);
            
            // Check expiry
            if (Date.now() - entry.timestamp > EXPIRY_MS) {
                localStorage.removeItem(`${CACHE_PREFIX}${key}`);
                return null;
            }

            return entry.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Check if key exists
     */
    has: (key: string): boolean => {
        return !!localStorage.getItem(`${CACHE_PREFIX}${key}`);
    }
};
