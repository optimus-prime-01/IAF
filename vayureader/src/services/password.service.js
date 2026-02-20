/**
 * Password Service
 * 
 * Handles password hashing and verification using bcrypt.
 * 
 * @module services/password.service
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password.
 * 
 * @param {string} plainPassword - The plain text password
 * @returns {Promise<string>} - The hashed password
 */
const hashPassword = async (plainPassword) => {
    if (!plainPassword || plainPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain text password with a hash.
 * 
 * @param {string} plainPassword - The plain text password
 * @param {string} hashedPassword - The hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    if (!plainPassword || !hashedPassword) {
        return false;
    }
    return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
    hashPassword,
    comparePassword,
    SALT_ROUNDS
};
