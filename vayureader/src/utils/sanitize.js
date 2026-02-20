/**
 * Input Sanitization Utilities
 * 
 * Provides functions for safely handling user input to prevent
 * injection attacks (ReDoS, NoSQL injection, etc.)
 * 
 * @module utils/sanitize
 */

const mongoose = require('mongoose');

/**
 * Escapes special regex characters to prevent ReDoS attacks.
 * Use this before passing user input to RegExp or $regex queries.
 * 
 * @param {string} str - User input string
 * @returns {string} - Escaped string safe for regex
 * 
 * @example
 * const safe = escapeRegex('(a+)+'); // Returns '\(a\+\)\+'
 * db.find({ name: { $regex: safe, $options: 'i' } });
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * 
 * @param {string} id - String to validate
 * @returns {boolean} - True if valid ObjectId
 * 
 * @example
 * if (!isValidObjectId(req.params.id)) {
 *   return res.status(400).json({ error: 'Invalid ID format' });
 * }
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id) &&
        new mongoose.Types.ObjectId(id).toString() === id;
};

/**
 * Sanitizes a phone number by removing non-digit characters.
 * 
 * @param {string} phone - Phone number input
 * @returns {string} - Cleaned phone number (digits only)
 */
const sanitizePhone = (phone) => {
    if (typeof phone !== 'string') return '';
    return phone.replace(/\D/g, '');
};

/**
 * Trims and normalizes a name string.
 * 
 * @param {string} name - Name input
 * @returns {string} - Trimmed name
 */
const sanitizeName = (name) => {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ');
};

/**
 * Creates a safe regex for case-insensitive exact match.
 * 
 * @param {string} str - String to match
 * @returns {RegExp} - Safe regex for exact match
 */
const createExactMatchRegex = (str) => {
    return new RegExp(`^${escapeRegex(str)}$`, 'i');
};

/**
 * Creates a safe regex for partial match (contains).
 * 
 * @param {string} str - String to search for
 * @returns {RegExp} - Safe regex for partial match
 */
const createContainsRegex = (str) => {
    return new RegExp(escapeRegex(str), 'i');
};

module.exports = {
    escapeRegex,
    isValidObjectId,
    sanitizePhone,
    sanitizeName,
    createExactMatchRegex,
    createContainsRegex
};
