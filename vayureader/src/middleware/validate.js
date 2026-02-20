/**
 * Request Validation Middleware
 * 
 * Provides validation utilities for request data.
 * 
 * @module middleware/validate
 */

const response = require('../utils/response');
const { isValidObjectId } = require('../utils/sanitize');

/**
 * Validates that required fields exist in request body.
 * 
 * @param {string[]} fields - Array of required field names
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/user', requireFields(['name', 'email']), createUser);
 */
const requireFields = (fields) => (req, res, next) => {
    const missing = fields.filter(field => {
        const value = req.body[field];
        return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
        return response.badRequest(
            res,
            `Missing required fields: ${missing.join(', ')}`
        );
    }

    next();
};

/**
 * Validates that a route parameter is a valid MongoDB ObjectId.
 * 
 * @param {string} [paramName='id'] - The name of the route parameter to validate
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/:id', validateObjectId(), handler); // validates req.params.id
 * router.get('/user/:userId', validateObjectId('userId'), handler); // validates req.params.userId
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
        return response.badRequest(res, `${paramName} parameter is required`);
    }

    if (!isValidObjectId(id)) {
        return response.badRequest(res, `Invalid ${paramName} format`);
    }

    next();
};

/**
 * Validates phone number format.
 * Allows digits, spaces, and common separators.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const validatePhoneNumber = (req, res, next) => {
    const phone = req.body.phone_number || req.body.contact;

    if (!phone) {
        return response.badRequest(res, 'Phone number is required');
    }

    // Remove non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return response.badRequest(res, 'Invalid phone number format');
    }

    next();
};

/**
 * Trims whitespace from string fields in request body.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const trimFields = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }
    next();
};

module.exports = {
    requireFields,
    validateObjectId,
    validatePhoneNumber,
    trimFields
};
