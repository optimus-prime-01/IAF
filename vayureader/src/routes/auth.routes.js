/**
 * Authentication Routes
 * 
 * Defines routes for user authentication.
 * Business logic is in auth.controller.js.
 * 
 * @module routes/auth.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const authController = require('../controllers/auth.controller');

// Middleware
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { requireFields, validatePhoneNumber, trimFields } = require('../middleware/validate');
const { authenticateUser } = require('../middleware/auth');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/auth/login/request-otp
 * Request OTP for login. Creates user if doesn't exist.
 */
router.post(
    '/login/request-otp',
    otpLimiter,
    trimFields,
    requireFields(['phone_number', 'name']),
    validatePhoneNumber,
    authController.requestLoginOtp
);

/**
 * POST /api/auth/login/verify-otp
 * Verify OTP and complete login.
 */
router.post(
    '/login/verify-otp',
    loginLimiter,
    trimFields,
    requireFields(['phone_number', 'otp']),
    authController.verifyLoginOtp
);

/**
 * POST /api/auth/logout
 * Logout user.
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/profile
 * Get current user's profile (requires authentication).
 */
router.get(
    '/profile',
    authenticateUser,
    authController.getProfile
);

module.exports = router;
