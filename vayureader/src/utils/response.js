/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formatting across all endpoints.
 * 
 * @module utils/response
 */

/**
 * Sends a successful response.
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const success = (res, data, message = null, statusCode = 200) => {
    const response = {
        success: true
    };

    if (message) {
        response.message = message;
    }

    if (data !== undefined) {
        response.data = data;
    }

    res.status(statusCode).json(response);
};

/**
 * Sends a created response (201).
 * 
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message='Created successfully'] - Success message
 */
const created = (res, data, message = 'Created successfully') => {
    success(res, data, message, 201);
};

/**
 * Sends an error response.
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {string} [errorCode] - Optional error code for client handling
 */
const error = (res, message, statusCode = 500, errorCode = null) => {
    const response = {
        success: false,
        message
    };

    if (errorCode) {
        response.errorCode = errorCode;
    }

    res.status(statusCode).json(response);
};

/**
 * Sends a bad request response (400).
 */
const badRequest = (res, message = 'Bad request') => {
    error(res, message, 400, 'BAD_REQUEST');
};

/**
 * Sends an unauthorized response (401).
 */
const unauthorized = (res, message = 'Unauthorized') => {
    error(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Sends a forbidden response (403).
 */
const forbidden = (res, message = 'Forbidden') => {
    error(res, message, 403, 'FORBIDDEN');
};

/**
 * Sends a not found response (404).
 */
const notFound = (res, message = 'Resource not found') => {
    error(res, message, 404, 'NOT_FOUND');
};

/**
 * Sends a conflict response (409).
 */
const conflict = (res, message = 'Resource already exists') => {
    error(res, message, 409, 'CONFLICT');
};

/**
 * Sends a too many requests response (429).
 */
const tooManyRequests = (res, message = 'Too many requests') => {
    error(res, message, 429, 'RATE_LIMIT_EXCEEDED');
};

/**
 * Sends a server error response (500).
 */
const serverError = (res, message = 'Internal server error') => {
    error(res, message, 500, 'SERVER_ERROR');
};

module.exports = {
    success,
    created,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    tooManyRequests,
    serverError
};
