/**
 * Cache Service
 * 
 * Provides utilities for cache management and invalidation.
 * 
 * @module services/cache.service
 */

const { redisClient } = require('../config/redis');

/**
 * Cache key patterns for different resources.
 */
const CACHE_PATTERNS = {
    WORD: 'word:*',
    ABBREVIATION: 'abbr:*',
    PDF_CATEGORIES: 'pdf:categories',
    PDF_LIST: 'pdf:list:*',
    PDF_SEARCH: 'pdf:search:*'
};

/**
 * Invalidate cache for a specific word.
 * @param {string} word - The word to invalidate
 */
const invalidateWord = async (word) => {
    try {
        const cacheKey = `word:${word.toUpperCase()}`;
        await redisClient.del(cacheKey);
        // Also invalidate the words preview list
        await redisClient.del('words:preview:100');
        // Invalidate paginated dictionary list caches (if enabled)
        await invalidateByPattern('words:all:*');
    } catch (error) {
        console.error('Cache invalidation error (word):', error.message);
    }
};

/**
 * Invalidate cache for a specific abbreviation.
 * @param {string} abbr - The abbreviation to invalidate
 */
const invalidateAbbreviation = async (abbr) => {
    try {
        const cacheKey = `abbr:${abbr.toUpperCase()}`;
        await redisClient.del(cacheKey);
        // Also invalidate the all-abbreviations cache
        await redisClient.del('abbr:all');
        // Invalidate search caches (using pattern)
        await invalidateByPattern('abbr:search:*');
        // Invalidate paginated/list abbreviation caches (if enabled)
        await invalidateByPattern('abbr:list:*');
    } catch (error) {
        console.error('Cache invalidation error (abbreviation):', error.message);
    }
};

/**
 * Invalidate PDF-related caches (categories, listings).
 */
const invalidatePdfCaches = async () => {
    try {
        await redisClient.del('pdf:categories');
        await invalidateByPattern('pdf:list:*');
        await invalidateByPattern('pdf:search:*');
    } catch (error) {
        console.error('Cache invalidation error (pdf):', error.message);
    }
};

/**
 * Invalidate all caches matching a pattern.
 * Uses SCAN for production-safe iteration.
 * @param {string} pattern - Redis key pattern (e.g., 'abbr:*')
 */
const invalidateByPattern = async (pattern) => {
    try {
        let cursor = '0'; // Redis returns cursor as string
        do {
            // Redis v4 scan returns { cursor: string, keys: string[] }
            const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = String(result.cursor); // Ensure it's a string for comparison
            const keys = result.keys;

            if (keys && keys.length > 0) {
                await redisClient.del(keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        console.error(`Cache pattern invalidation error (${pattern}):`, error.message);
        // Don't throw - cache errors shouldn't break the main operation
    }
};

/**
 * Invalidate all dictionary caches (use after bulk upload).
 */
const invalidateAllDictionaryCaches = async () => {
    try {
        await invalidateByPattern('word:*');
        await redisClient.del('words:preview:100');
        await invalidateByPattern('words:all:*');
    } catch (error) {
        console.error('Cache invalidation error (all dictionary):', error.message);
    }
};

/**
 * Invalidate all abbreviation caches (use after bulk upload).
 */
const invalidateAllAbbreviationCaches = async () => {
    try {
        await invalidateByPattern('abbr:*');
        await invalidateByPattern('abbr:list:*');
    } catch (error) {
        console.error('Cache invalidation error (all abbreviation):', error.message);
    }
};

/**
 * Get cache statistics.
 * @returns {Object} Cache statistics
 */
const getCacheStats = async () => {
    try {
        const info = await redisClient.info('memory');
        const dbSize = await redisClient.dbSize();
        return {
            keyCount: dbSize,
            memoryInfo: info
        };
    } catch (error) {
        console.error('Error getting cache stats:', error.message);
        return { error: error.message };
    }
};

module.exports = {
    CACHE_PATTERNS,
    invalidateWord,
    invalidateAbbreviation,
    invalidatePdfCaches,
    invalidateByPattern,
    invalidateAllDictionaryCaches,
    invalidateAllAbbreviationCaches,
    getCacheStats
};
