/**
 * User Audit Routes
 * 
 * Defines routes for user audit log access.
 * Business logic is in userAudit.controller.js.
 * 
 * @module routes/userAudit.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const userAuditController = require('../controllers/userAudit.controller');

// Middleware
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const { validateObjectId } = require('../middleware/validate');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/user-audit/logs
 * Get paginated user audit logs with optional filters.
 */
router.get(
    '/logs',
    authenticateAdmin,
    requirePermission('view_user_audit'),
    userAuditController.getLogs
);

/**
 * GET /api/user-audit/stats
 * Get user audit statistics.
 */
router.get(
    '/stats',
    authenticateAdmin,
    requirePermission('view_user_audit'),
    userAuditController.getStats
);

/**
 * GET /api/user-audit/user/:userId
 * Get audit logs for a specific user.
 */
router.get(
    '/user/:userId',
    authenticateAdmin,
    requirePermission('view_user_audit'),
    validateObjectId('userId'),
    userAuditController.getUserLogs
);

module.exports = router;
