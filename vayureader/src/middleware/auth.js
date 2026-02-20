/**
 * User Authentication Middleware
 * 
 * Verifies JWT tokens for regular users.
 * 
 * @module middleware/auth
 */

const { verifyToken } = require('../services/jwt.service');
const response = require('../utils/response');
const User = require('../models/User');

/**
 * Authenticates a user via JWT token.
 * Expects token in Authorization header: "Bearer <token>"
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticateUser = async (req, res, next) => {
    try {
        let token;

        // Check cookie first
        if (req.cookies && req.cookies.auth_token) {
            token = req.cookies.auth_token;
        }
        // Fallback to Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        const decoded = verifyToken(token);

        // Ensure it's a user token (not admin)
        if (decoded.type !== 'user') {
            return response.unauthorized(res, 'Invalid token type');
        }

        // Check if user is blocked or deleted
        const user = await User.findById(decoded.userId).select('isBlocked');
        if (!user) {
            return response.unauthorized(res, 'User no longer exists');
        }
        if (user.isBlocked) {
            return response.unauthorized(res, 'User is blocked');
        }

        // Attach user info to request (includes userId, phone_number, deviceId, name)
        req.user = {
            userId: decoded.userId,
            phone_number: decoded.phone_number,
            deviceId: decoded.deviceId,
            name: decoded.name
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'Token expired');
        }
        // Handle database errors or invalid token errors
        return response.unauthorized(res, 'Invalid token');
    }
};

/**
 * Optional authentication.
 * Doesn't reject if no token, but attaches user if valid token provided.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const optionalAuth = async (req, res, next) => {
    let token;

    // Check cookie first
    if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
    }
    // Fallback to Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(); // Continue without user
    }

    try {
        const decoded = verifyToken(token);

        if (decoded.type === 'user') {
            // Validate user still exists and is not blocked
            const user = await User.findById(decoded.userId).select('isBlocked');
            if (user && !user.isBlocked) {
                req.user = {
                    userId: decoded.userId,
                    phone_number: decoded.phone_number,
                    deviceId: decoded.deviceId,
                    name: decoded.name
                };
            }
        } else if (decoded.type === 'admin') {
            req.admin = decoded;
        }
    } catch (error) {
        // Silently ignore invalid tokens for optional auth
    }

    next();
};

module.exports = {
    authenticateUser,
    optionalAuth
};
