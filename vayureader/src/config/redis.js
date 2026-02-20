/**
 * Redis Connection
 * 
 * Initializes the Redis client and handles connection events.
 * 
 * @module config/redis
 */

const { createClient } = require('redis');
const { redis: redisConfig } = require('./environment');

const redisClient = createClient({
    url: redisConfig.url
});

redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
});

redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

/**
 * Ensures Redis is connected before returning the client.
 */
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
};

/**
 * Creates a new Redis client for Pub/Sub subscriptions.
 * Redis Pub/Sub requires dedicated clients for subscribers.
 * 
 * @returns {Promise<RedisClient>} Connected subscriber client
 */
const createSubscriberClient = async () => {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    return subscriber;
};

module.exports = {
    redisClient,
    connectRedis,
    createSubscriberClient
};
