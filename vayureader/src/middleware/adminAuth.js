/**
 * Admin Authentication Middleware
 * 
 * Verifies JWT tokens for admins and provides role-based access control.
 * 
 * @module middleware/adminAuth
 */

const { verifyToken } = require('../services/jwt.service');
const response = require('../utils/response');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

/**
 * Authenticates an admin via JWT token.
 * Reads token from:
 * 1. HTTP-only cookie (admin_token)
 * 2. Authorization header (Bearer token) - fallback
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const Admin = require('../models/Admin');

/**
 * Authenticates an admin via JWT token.
 * Reads token from:
 * 1. HTTP-only cookie (admin_token)
 * 2. Authorization header (Bearer token) - fallback
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        let token;

        // Try to get token from cookie first
        if (req.cookies && req.cookies.admin_token) {
            token = req.cookies.admin_token;
        } else {
            // Fallback to Authorization header
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        const decoded = verifyToken(token);

        // Ensure it's an admin token
        if (decoded.type !== 'admin') {
            return response.unauthorized(res, 'Admin access required');
        }

        // Database verification: ensure admin exists and token session is still valid.
        const admin = await Admin.findById(decoded.adminId)
            .select('name contact isSuperAdmin permissions tokenVersion');
        if (!admin) {
            return response.unauthorized(res, 'Admin account no longer exists');
        }

        const decodedTokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0;
        const currentTokenVersion = admin.tokenVersion || 0;
        if (decodedTokenVersion !== currentTokenVersion) {
            return response.unauthorized(res, 'Session expired. Please login again.');
        }

        // Optional: Check if admin is disabled/suspended (if such a field exists)
        // if (admin.status === 'suspended') return response.unauthorized(res, 'Account suspended');

        // Attach fresh admin info to request
        req.admin = {
            adminId: admin._id,
            name: admin.name,
            contact: admin.contact,
            isSuperAdmin: admin.isSuperAdmin,
            permissions: admin.permissions || []
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'Token expired');
        }
        // Handle database errors distinct from token errors if needed, but safe to genericize
        console.error('Admin Auth Error:', error.message);
        return response.unauthorized(res, 'Invalid token or authentication failed');
    }
};

/**
 * Checks if the authenticated admin is a super admin.
 * Must be used after authenticateAdmin.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.admin) {
        return response.unauthorized(res, 'Admin authentication required');
    }

    if (!req.admin.isSuperAdmin) {
        return response.forbidden(res, 'Super admin access required');
    }

    next();
};

/**
 * Creates middleware that checks for a specific permission.
 * Must be used after authenticateAdmin.
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/pdfs', authenticateAdmin, requirePermission('manage_pdfs'), createPdf);
 */
const requirePermission = (permission) => (req, res, next) => {
    if (!req.admin) {
        return response.unauthorized(res, 'Admin authentication required');
    }

    // Super admins have all permissions
    if (req.admin.isSuperAdmin) {
        return next();
    }

    if (!req.admin.permissions.includes(permission)) {
        return response.forbidden(res, `Permission required: ${permission}`);
    }

    next();
};

/**
 * Unified authentication for both users and admins.
 * Users get read-only access, admins get full access.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const unifiedAuth = async (req, res, next) => {
    try {
        let token;

        // 1. Check Cookies
        if (req.cookies) {
            if (req.cookies.admin_token) token = req.cookies.admin_token;
            else if (req.cookies.auth_token) token = req.cookies.auth_token;
        }

        // 2. Fallback to Header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        const decoded = verifyToken(token);

        if (decoded.type === 'admin') {
            const cacheKey = `auth_admin:${decoded.adminId}`;
            let admin;
            const cachedAdmin = await redisClient.get(cacheKey);

            if (cachedAdmin) {
                admin = JSON.parse(cachedAdmin);
            } else {
                // Fix Zombie Admin: Validate admin exists in DB even for unifiedAuth
                admin = await Admin.findById(decoded.adminId)
                    .select('name contact isSuperAdmin permissions tokenVersion')
                    .lean();
                if (admin) {
                    await redisClient.set(cacheKey, JSON.stringify(admin), { EX: 60 }); // Cache for 60s
                }
            }

            if (!admin) {
                return response.unauthorized(res, 'Admin account no longer exists');
            }

            const decodedTokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0;
            const currentTokenVersion = admin.tokenVersion || 0;
            if (decodedTokenVersion !== currentTokenVersion) {
                return response.unauthorized(res, 'Session expired. Please login again.');
            }

            req.admin = {
                adminId: admin._id,
                name: admin.name,
                contact: admin.contact,
                isSuperAdmin: admin.isSuperAdmin,
                permissions: admin.permissions || []
            };
            req.userType = 'admin';
            return next();
        }

        if (decoded.type === 'user') {
            // Users can only access GET methods
            const readOnlyMethods = ['GET', 'HEAD', 'OPTIONS'];
            if (!readOnlyMethods.includes(req.method)) {
                return response.forbidden(res, 'Users can only perform read operations');
            }

            const cacheKey = `auth_user:${decoded.userId}`;
            let user;
            const cachedUser = await redisClient.get(cacheKey);

            if (cachedUser) {
                user = JSON.parse(cachedUser);
            } else {
                // Validate user still exists and is not blocked
                user = await User.findById(decoded.userId).select('isBlocked tokenVersion').lean();
                if (user) {
                    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 60 }); // Cache for 60s
                }
            }

            if (!user) {
                return response.unauthorized(res, 'User no longer exists');
            }
            if (user.isBlocked) {
                return response.unauthorized(res, 'User is blocked');
            }

            const decodedTokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0;
            const currentTokenVersion = user.tokenVersion || 0;
            if (decodedTokenVersion !== currentTokenVersion) {
                return response.unauthorized(res, 'Session expired. Please login again.');
            }

            req.user = { userId: decoded.userId };
            req.userType = 'user';
            return next();
        }

        return response.unauthorized(res, 'Invalid token type');
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'Token expired');
        }
        return response.unauthorized(res, 'Invalid token');
    }
};

module.exports = {
    authenticateAdmin,
    requireSuperAdmin,
    requirePermission,
    unifiedAuth
};
