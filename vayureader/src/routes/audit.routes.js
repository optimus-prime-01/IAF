/**
 * Audit Routes
 * 
 * Defines routes for audit log access.
 * Business logic is in audit.controller.js.
 * 
 * @module routes/audit.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const auditController = require('../controllers/audit.controller');

// Middleware
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/audit/logs
 * Get paginated audit logs with optional filters.
 */
router.get(
    '/logs',
    authenticateAdmin,
    requirePermission('view_audit'),
    auditController.getLogs
);

/**
 * GET /api/audit/stats
 * Get audit statistics.
 */
router.get(
    '/stats',
    authenticateAdmin,
    requirePermission('view_audit'),
    auditController.getStats
);

module.exports = router;
