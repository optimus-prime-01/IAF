#!/usr/bin/env node
/**
 * Clear Cache Script
 * 
 * Flushes all data from Redis cache.
 * Useful when data is out of sync or after bulk updates.
 * 
 * Usage: node scripts/clearCache.js
 */

require('dotenv').config();
const { redisClient, connectRedis } = require('../src/config/redis');

async function main() {
    try {
        console.log('[Cache] Connecting to Redis...');
        await connectRedis();
        console.log('[Cache] Redis connected');

        console.log('[Cache] Flushing all keys...');
        await redisClient.flushAll();

        console.log('[Cache] ✅ Cache cleared successfully!');
    } catch (error) {
        console.error('[Cache] ❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
        process.exit(0);
    }
}

main();
