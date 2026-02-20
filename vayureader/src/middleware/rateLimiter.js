/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting using Redis for distributed rate limiting.
 * This ensures rate limits work across multiple server instances.
 * 
 * @module middleware/rateLimiter
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');
const { rateLimit: rateLimitConfig } = require('../config/environment');
const apiLimitConfig = require('../config/apiLimit-config');

/**
 * Create a Redis store for rate limiting.
 * Falls back to memory store if Redis is not available.
 */
const createRedisStore = (prefix) => {
    try {
        return new RedisStore({
            sendCommand: async (...args) => {
                const { connectRedis } = require('../config/redis');
                // Ensure connection is established before sending command
                if (!redisClient.isOpen) {
                    await connectRedis();
                }
                return redisClient.sendCommand(args);
            },
            prefix: `rl:${prefix}:`
        });
    } catch (error) {
        console.warn(`[Rate Limiter] Redis store failed for ${prefix}, using memory store:`, error.message);
        return undefined; // Falls back to default memory store
    }
};

/**
 * Create a custom rate limiter instance.
 * 
 * @param {Object} options Configuration options
 * @param {string} options.prefix Redis key prefix (required)
 * @param {number} [options.windowMs] Time window in ms
 * @param {number} [options.max] Max requests per window
 * @param {string} [options.message] Error message
 * @returns {Function} Express middleware
 */
const createLimiter = ({ prefix, windowMs, max, message }) => {
    return rateLimit({
        windowMs: windowMs || rateLimitConfig.windowMs,
        max: max || rateLimitConfig.maxRequests,
        store: createRedisStore(prefix),
        message: {
            success: false,
            message: message || 'Too many requests, please try again later',
            errorCode: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

/**
 * General API rate limiter.
 * Limits requests per IP for all API endpoints.
 */
const apiLimiter = createLimiter({
    prefix: 'api',
    ...apiLimitConfig.default
});

/**
 * OTP request rate limiter.
 * Stricter limits to prevent SMS gateway abuse and brute force.
 */
const otpLimiter = createLimiter({
    ...apiLimitConfig.auth.otp
});

/**
 * Login attempt rate limiter.
 * Limits login attempts to prevent credential stuffing.
 */
const loginLimiter = createLimiter({
    ...apiLimitConfig.auth.login
});

module.exports = {
    createLimiter,
    apiLimiter,
    otpLimiter,
    loginLimiter
};
