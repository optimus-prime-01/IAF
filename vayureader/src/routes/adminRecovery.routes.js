/**
 * Admin Recovery Routes
 * 
 * Defines routes for admin password recovery via security questions.
 * 
 * @module routes/adminRecovery.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const adminRecoveryController = require('../controllers/adminRecovery.controller');

// Middleware
const { authenticateAdmin } = require('../middleware/adminAuth');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { requireFields, trimFields } = require('../middleware/validate');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/admin/recovery/questions
 * Get list of available security questions.
 */
router.get('/questions', adminRecoveryController.getQuestions);

/**
 * POST /api/admin/recovery/setup
 * Setup security questions for current admin.
 * Requires authentication.
 */
router.post(
    '/setup',
    authenticateAdmin,
    trimFields,
    requireFields(['securityQuestions']),
    adminRecoveryController.setupSecurityQuestions
);

/**
 * POST /api/admin/recovery/initiate
 * Initiate password recovery - returns security questions.
 * Rate limited to prevent enumeration.
 */
router.post(
    '/initiate',
    loginLimiter,
    trimFields,
    requireFields(['contact']),
    adminRecoveryController.initiateRecovery
);

/**
 * POST /api/admin/recovery/verify
 * Verify security question answers and send OTP.
 * Rate limited to prevent brute force.
 */
router.post(
    '/verify',
    otpLimiter,
    trimFields,
    requireFields(['contact', 'answers']),
    adminRecoveryController.verifyRecoveryAnswers
);

/**
 * POST /api/admin/recovery/reset
 * Verify OTP and reset password.
 */
router.post(
    '/reset',
    otpLimiter,
    trimFields,
    requireFields(['contact', 'otp', 'loginToken', 'newPassword']),
    adminRecoveryController.resetPassword
);

module.exports = router;
