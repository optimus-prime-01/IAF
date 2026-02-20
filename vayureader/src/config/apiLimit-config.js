/**
 * API Rate Limiting Configuration
 * 
 * Centralized configuration for API rate limits.
 * Used by the rateLimiter middleware to apply limits to specific endpoints.
 * 
 * Format:
 * key: {
 *   windowMs: number, // Time window in milliseconds
 *   max: number,      // Max requests per window
 *   message: string   // Usage exceeded message
 * }
 */

const { rateLimit: globalLimits } = require('./environment');

const apiLimitConfig = {
    // Default API limit (fallback)
    default: {
        windowMs: globalLimits.windowMs, // 15 minutes by default from env
        max: globalLimits.maxRequests,   // 100 requests by default from env
        message: 'Too many requests, please try again later'
    },

    // Authentication related limits
    auth: {
        otp: {
            prefix: 'otp',
            windowMs: globalLimits.windowMs,
            max: globalLimits.otpMaxRequests,
            message: 'Too many OTP requests, please try again later'
        },
        login: {
            prefix: 'login',
            windowMs: 60 * 1000, // 1 minute
            max: 20, // Increased for admin dashboard
            message: 'Too many login attempts, please try again later'
        },
        createAdmin: {
            prefix: 'create-admin',
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 50,
            message: 'Too many admin creation attempts'
        }
    },

    // Critical operations
    uploads: {
        dictionary: {
            prefix: 'upload-dict',
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10,
            message: 'Upload limit exceeded'
        },
        abbreviation: {
            prefix: 'upload-abbr',
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10,
            message: 'Upload limit exceeded'
        }
    },

    // Search operations (often higher volume allowed, or tighter to prevent scraping)
    search: {
        prefix: 'search',
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 1 request per second average
        message: 'Search limit exceeded, please slow down'
    }
};

module.exports = apiLimitConfig;
