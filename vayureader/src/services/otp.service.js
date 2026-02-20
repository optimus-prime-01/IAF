const crypto = require('crypto');
const { otp: otpConfig, jwt: jwtConfig } = require('../config/environment');
const { redisClient } = require('../config/redis');

// Prefix for Redis keys
const KEY_PREFIX = 'vayureader-otp:';

/**
 * Derives a 32-byte encryption key from the server secret.
 */
/**
 * Derives a 32-byte encryption key from the server secret and an optional login token.
 */
const getEncryptionKey = (loginToken = '') => {
    return crypto.createHash('sha256')
        .update(jwtConfig.secret + loginToken)
        .digest();
};

/**
 * Encrypts a string using AES-256-GCM.
 * @param {string} text 
 * @returns {string} iv:authTag:encrypted (base64)
 */
const encrypt = (text, loginToken = '') => {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey(loginToken);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string using AES-256-GCM.
 * @param {string} encryptedData iv:authTag:encrypted
 * @returns {string|null} decrypted text or null on failure
 */
const decrypt = (encryptedData, loginToken = '') => {
    try {
        const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');

        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const key = getEncryptionKey(loginToken);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[OTP Decryption Error]:', error.message);
        return null;
    }
};

/**
 * Generates a 6-digit OTP code.
 */
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generates a random login token for 2FA.
 */
const generateLoginToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Saves ENCRYPTED OTP to Redis with a TTL.
 * 
 * @param {string} identifier - unique key (e.g., phone)
 * @param {string} otp - OTP code (plain text)
 * @returns {Promise<void>}
 */
const saveOtp = async (identifier, otp, loginToken = '', deviceId = '') => {
    const key = `${KEY_PREFIX}${identifier}`;
    const data = {
        otp: encrypt(otp, loginToken),
        deviceId
    };
    const ttlSeconds = otpConfig.expiryMinutes * 60;

    await redisClient.set(key, JSON.stringify(data), {
        EX: ttlSeconds
    });
};

/**
 * Retrieves and DECRYPTS OTP from Redis.
 */
const getOtpData = async (identifier) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const json = await redisClient.get(key);

    if (!json) return null;

    try {
        return JSON.parse(json);
    } catch (err) {
        // Fallback for old simple string values during transition
        return { otp: json, deviceId: '' };
    }
};

/**
 * Deletes OTP from Redis.
 */
const deleteOtp = async (identifier) => {
    const key = `${KEY_PREFIX}${identifier}`;
    await redisClient.del(key);
};

/**
 * Verifies an OTP code against Redis value.
 */
const verifyOtp = async (providedOtp, identifier, loginToken = '', providedDeviceId = '') => {
    const data = await getOtpData(identifier);

    if (!data) {
        return {
            valid: false,
            error: 'OTP has expired or does not exist. Please request a new one.'
        };
    }

    // Verify Device ID if provided (lockdown)
    if (data.deviceId && providedDeviceId && data.deviceId !== providedDeviceId) {
        console.warn(`[OTP] Device mismatch for ${identifier}: stored=${data.deviceId}, provided=${providedDeviceId}`);
        return {
            valid: false,
            error: 'Authentication failed: Device mismatch. Please login again from the original device.'
        };
    }

    // Check failed attempts
    const failedAttempts = data.failedAttempts || 0;
    if (failedAttempts >= otpConfig.maxAttempts) {
        // Delete OTP if max attempts reached (security lockout)
        await deleteOtp(identifier);
        return {
            valid: false,
            error: 'Too many failed attempts. Please request a new OTP.'
        };
    }

    const decryptedOtp = decrypt(data.otp, loginToken);

    if (!decryptedOtp || String(providedOtp) !== String(decryptedOtp)) {
        console.warn(`[OTP] Mismatch for ${identifier}: provided=${providedOtp}`);

        // Increment failed attempts
        const newData = { ...data, failedAttempts: failedAttempts + 1 };
        // Update Redis (keeping original TTL if possible, or reset to short window)
        // Here we just update the record. Ideally, we should preserve the remaining TTL.
        // For simplicity, we'll reset TTL to remaining time if we could calculate it, 
        // but 'set' without specific options might overwrite. 
        // Let's use KEEPTTL if available (Redis 6+), otherwise restart expiry.
        // Node-redis 'set' with 'KEEPTTL' option:
        const key = `${KEY_PREFIX}${identifier}`;
        await redisClient.set(key, JSON.stringify(newData), { KEEPTTL: true });

        return {
            valid: false,
            error: 'Invalid OTP'
        };
    }

    // Success - delete used OTP immediately to prevent Race Condition (Replay Attack)
    await deleteOtp(identifier);

    return {
        valid: true,
        error: null
    };
};

/**
 * Checks if OTP sending should be skipped (dev mode).
 */
const shouldSkipSend = () => {
    return otpConfig.skipSend;
};

module.exports = {
    generateOtp,
    generateLoginToken,
    saveOtp,
    getOtpData,
    deleteOtp,
    verifyOtp,
    shouldSkipSend
};
