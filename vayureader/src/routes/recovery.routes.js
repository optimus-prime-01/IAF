/**
 * Recovery Routes
 * 
 * Defines routes for password recovery via security questions.
 * Business logic is in recovery.controller.js.
 * 
 * @module routes/recovery.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const recoveryController = require('../controllers/recovery.controller');

// Middleware
const { authenticateUser } = require('../middleware/auth');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { requireFields, trimFields } = require('../middleware/validate');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/recovery/questions
 * Get list of available security questions.
 */
router.get('/questions', recoveryController.getQuestions);

/**
 * POST /api/recovery/setup
 * Setup security questions for current user.
 * Requires authentication.
 */
router.post(
    '/setup',
    authenticateUser,
    trimFields,
    requireFields(['securityQuestions']),
    recoveryController.setupSecurityQuestions
);

/**
 * POST /api/recovery/initiate
 * Initiate password recovery - returns security questions.
 * Rate limited to prevent enumeration.
 */
router.post(
    '/initiate',
    loginLimiter,
    trimFields,
    requireFields(['phone_number']),
    recoveryController.initiateRecovery
);

/**
 * POST /api/recovery/verify
 * Verify security question answers and send OTP.
 * Rate limited to prevent brute force.
 */
router.post(
    '/verify',
    otpLimiter,
    trimFields,
    requireFields(['phone_number', 'answers', 'deviceId']),
    recoveryController.verifyRecoveryAnswers
);

module.exports = router;
