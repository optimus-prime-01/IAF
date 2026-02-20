/**
 * JWT Service
 * 
 * Handles JWT token generation and verification.
 * 
 * @module services/jwt.service
 */

const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/environment');

/**
 * Generates a JWT token for a user.
 * 
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Object} [additionalPayload={}] - Additional data to include in token
 * @returns {string} JWT token
 */
const generateUserToken = (userId, additionalPayload = {}) => {
    const payload = {
        userId,
        type: 'user',
        ...additionalPayload
    };

    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.expiryDays}d`
    });
};

/**
 * Generates a lifetime JWT token for a user (100 years).
 * Used for device-bound authentication.
 * 
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Object} [additionalPayload={}] - Additional data to include in token
 * @returns {string} JWT token
 */
const generateLifetimeUserToken = (userId, additionalPayload = {}) => {
    const payload = {
        userId,
        type: 'user',
        lifetime: true,
        ...additionalPayload
    };

    // Use configurable lifetime from env
    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.lifetimeDays}d`
    });
};

/**
 * Generates a JWT token for an admin.
 * 
 * @param {Object} admin - Admin document
 * @returns {string} JWT token
 */
const generateAdminToken = (admin) => {
    const payload = {
        adminId: admin._id,
        name: admin.name,
        contact: admin.contact,
        isSuperAdmin: admin.isSuperAdmin || false,
        permissions: admin.permissions || [],
        type: 'admin'
    };

    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.expiryDays}d`
    });
};

/**
 * Verifies a JWT token.
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
    return jwt.verify(token, jwtConfig.secret);
};

/**
 * Decodes a JWT token without verification.
 * Useful for debugging or reading expired tokens.
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateUserToken,
    generateLifetimeUserToken,
    generateAdminToken,
    verifyToken,
    decodeToken
};
