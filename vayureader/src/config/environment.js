/**
 * Environment Configuration
 * 
 * Validates and exports environment variables.
 * Server will fail fast on startup if required variables are missing.
 * 
 * @module config/environment
 */

require('dotenv').config();

// =============================================================================
// REQUIRED ENVIRONMENT VARIABLES
// =============================================================================
const REQUIRED_ENV_VARS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'OTP_GATEWAY_URL'
];

/**
 * Validates that all required environment variables are present.
 * Throws an error if any are missing, preventing server startup.
 */
const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            `Please copy .env.example to .env and fill in the values.`
        );
    }

    // Validate JWT_SECRET minimum length
    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
};

// Run validation on module load
validateEnv();

// =============================================================================
// EXPORTED CONFIGURATION
// =============================================================================

/**
 * Server configuration
 */
const server = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    // SECURITY: TESTING mode is NEVER allowed in production to prevent
    // SameSite=None cookies which would disable CSRF protection.
    isTesting: process.env.TESTING === 'true' && process.env.NODE_ENV !== 'production'
};

/**
 * Database configuration
 */

// Determine TLS setting: manual override takes priority, then auto-detect for production
const getTlsSetting = () => {
    // Manual override via environment variable
    if (process.env.MONGODB_TLS === 'true') return true;
    if (process.env.MONGODB_TLS === 'false') return false;

    // Auto-detect: Enable TLS in production for non-local, non-SRV connections
    // MongoDB Atlas SRV connections (mongodb+srv://) handle TLS automatically
    const uri = process.env.MONGODB_URI || '';
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');
    const isSRV = uri.startsWith('mongodb+srv://');

    // Only explicitly set TLS for standard (non-SRV) connections in production to remote hosts
    if (isProduction && !isLocalhost && !isSRV) {
        return true;
    }

    // For SRV connections or local connections, let MongoDB driver handle TLS
    return undefined;
};

const database = {
    uri: process.env.MONGODB_URI,
    options: {
        // TLS setting: manual override > auto-detect > driver default
        ...(getTlsSetting() !== undefined ? { tls: getTlsSetting() } : {}),
        serverSelectionTimeoutMS: 10000,  // Increased for cloud deployments
        socketTimeoutMS: 45000,
        // Connection pool settings
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10)
    }
};

/**
 * JWT configuration
 */
const jwt = {
    secret: process.env.JWT_SECRET,
    expiryDays: parseInt(process.env.JWT_EXPIRY_DAYS || '1', 10),
    lifetimeDays: parseInt(process.env.JWT_LIFETIME_DAYS || '36500', 10) // Default 100 years
};

/**
 * OTP configuration
 */
const otp = {
    gatewayUrl: process.env.OTP_GATEWAY_URL,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    skipSend: process.env.SKIP_OTP_SEND === 'true'
};

/**
 * CORS configuration
 */
const cors = {
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : []
};

/**
 * Rate limiting configuration
 */
const rateLimit = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10), // Increased for admin dashboard
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10)
};

/**
 * Redis configuration
 */
const redis = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

module.exports = {
    server,
    database,
    jwt,
    otp,
    cors,
    rateLimit,
    redis
};
