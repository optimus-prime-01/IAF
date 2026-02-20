/**
 * CORS Configuration
 * 
 * Whitelist-based CORS configuration for security.
 * 
 * @module config/cors
 */

const { cors: corsConfig, server } = require('./environment');

/**
 * CORS options factory.
 * In development with no whitelist: allows all origins.
 * In production or with whitelist: strict origin checking.
 */
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, mobile apps)
        if (!origin) {
            return callback(null, true);
        }

        // If no whitelist configured and in development, allow all
        if (corsConfig.allowedOrigins.length === 0 && server.isDevelopment) {
            return callback(null, true);
        }

        // Check if origin is in whitelist
        if (corsConfig.allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Reject unauthorized origin
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],

    exposedHeaders: ['Content-Type', 'Authorization'],

    maxAge: 86400 // 24 hours
};

module.exports = { corsOptions };
