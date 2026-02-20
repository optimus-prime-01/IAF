/**
 * Admin Routes
 * 
 * Defines routes for admin authentication and sub-admin management.
 * Business logic is in admin.controller.js.
 * 
 * @module routes/admin.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const adminController = require('../controllers/admin.controller');

// Middleware
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { authenticateAdmin, requireSuperAdmin, requirePermission } = require('../middleware/adminAuth');
const { requireFields, validateObjectId, trimFields } = require('../middleware/validate');

// =============================================================================
// AUTHENTICATION ROUTES (Password + OTP 2FA)
// =============================================================================

/**
 * POST /api/admin/login/request-otp
 * Step 1: Verify password and send OTP.
 */
router.post(
    '/login/request-otp',
    otpLimiter,
    trimFields,
    requireFields(['contact', 'password']),
    adminController.requestLoginOtp
);

/**
 * POST /api/admin/login/verify-otp
 * Step 2: Verify OTP and complete login.
 */
router.post(
    '/login/verify-otp',
    loginLimiter,
    trimFields,
    requireFields(['contact', 'otp', 'loginToken']),
    adminController.verifyLoginOtp
);

/**
 * GET /api/admin/me
 * Get current authenticated admin info (for session validation).
 */
router.get('/me', authenticateAdmin, adminController.getCurrentAdmin);

/**
 * POST /api/admin/logout
 * Logout and clear cookie.
 */
router.post('/logout', adminController.logout);

// =============================================================================
// SUB-ADMIN MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/admin/sub-admins
 * Get all sub-admins.
 * Requires: Super admin OR manage_admins permission.
 */
router.get(
    '/sub-admins',
    authenticateAdmin,
    requirePermission('manage_admins'),
    adminController.getAllSubAdmins
);

/**
 * GET /api/admin/sub-admins/:id
 * Get a single sub-admin by ID.
 */
router.get(
    '/sub-admins/:id',
    authenticateAdmin,
    requirePermission('manage_admins'),
    validateObjectId('id'),
    adminController.getSubAdminById
);

/**
 * POST /api/admin/sub-admins
 * Create a new sub-admin.
 * Requires: Super admin OR manage_admins permission.
 */
router.post(
    '/sub-admins',
    authenticateAdmin,
    requirePermission('manage_admins'),
    trimFields,
    requireFields(['name', 'contact', 'password']),
    adminController.createSubAdmin
);

/**
 * PUT /api/admin/sub-admins/:id
 * Update a sub-admin's permissions.
 */
router.put(
    '/sub-admins/:id',
    authenticateAdmin,
    requirePermission('manage_admins'),
    validateObjectId('id'),
    trimFields,
    adminController.updateSubAdmin
);

/**
 * DELETE /api/admin/sub-admins/:id
 * Delete a sub-admin.
 */
router.delete(
    '/sub-admins/:id',
    authenticateAdmin,
    requirePermission('manage_admins'),
    validateObjectId('id'),
    adminController.deleteSubAdmin
);

// =============================================================================
// USER MANAGEMENT ROUTES (Admin creates users)
// =============================================================================

/**
 * GET /api/admin/users
 * Get all users (paginated with search).
 */
router.get(
    '/users',
    authenticateAdmin,
    requirePermission('view_user_audit'),
    adminController.getAllUsers
);

/**
 * POST /api/admin/users
 * Create a new user (admin pre-registration).
 * User will need to set security questions on first login.
 */
router.post(
    '/users',
    authenticateAdmin,
    requireSuperAdmin,
    trimFields,
    requireFields(['name', 'phone_number']),
    adminController.createUser
);

module.exports = router;
