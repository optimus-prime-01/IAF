/**
 * Error Handler Middleware
 * 
 * Centralized error handling for consistent error responses.
 * 
 * @module middleware/errorHandler
 */

const { server } = require('../config/environment');

/**
 * 404 Not Found handler.
 * Catches requests to undefined routes.
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        errorCode: 'ROUTE_NOT_FOUND'
    });
};

/**
 * Global error handler.
 * Catches all unhandled errors and returns consistent response.
 */
const errorHandler = (err, req, res, _next) => {
    // Log error in development
    if (server.isDevelopment) {
        console.error('❌ Error:', err);
    } else {
        console.error('❌ Error:', err.message);
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => e.message),
            errorCode: 'VALIDATION_ERROR'
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            errorCode: 'INVALID_ID'
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry',
            errorCode: 'DUPLICATE_ENTRY'
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token',
            errorCode: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired',
            errorCode: 'TOKEN_EXPIRED'
        });
    }

    // CORS error
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            message: err.message,
            errorCode: 'CORS_ERROR'
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        success: false,
        message: server.isDevelopment ? err.message : 'Internal server error',
        errorCode: 'SERVER_ERROR',
        ...(server.isDevelopment && { stack: err.stack })
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};
