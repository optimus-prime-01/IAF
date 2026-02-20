/**
 * Abbreviation Routes
 * 
 * Defines routes for abbreviation operations.
 * Business logic is in abbreviation.controller.js.
 * 
 * @module routes/abbreviation.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const abbreviationController = require('../controllers/abbreviation.controller');

// Middleware
const { unifiedAuth, authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const { validateObjectId, trimFields, requireFields } = require('../middleware/validate');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/abbreviations
 * Search abbreviations.
 */
router.get(
    '/',
    abbreviationController.searchAbbreviations
);

// =============================================================================
// AUTHENTICATED ROUTES (must be before /:abbr wildcard)
// =============================================================================

/**
 * GET /api/abbreviations/all
 * Get all abbreviations with pagination.
 */
router.get(
    '/all',
    unifiedAuth,
    abbreviationController.getAllAbbreviations
);

/**
 * GET /api/abbreviations/export/all
 * Export all abbreviations (admin only).
 */
router.get(
    '/export/all',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    abbreviationController.exportAbbreviations
);

// =============================================================================
// PUBLIC WILDCARD ROUTE (must be after specific routes)
// =============================================================================

/**
 * GET /api/abbreviations/:abbr
 * Look up specific abbreviation.
 */
router.get(
    '/:abbr',
    abbreviationController.getAbbreviation
);

/**
 * POST /api/abbreviations
 * Create new abbreviation (admin only).
 */
router.post(
    '/',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    trimFields,
    requireFields(['abbreviation', 'fullForm']),
    abbreviationController.createAbbreviation
);

/**
 * PUT /api/abbreviations/:id
 * Update abbreviation (admin only).
 */
router.put(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    validateObjectId(),
    trimFields,
    requireFields(['abbreviation', 'fullForm']),
    abbreviationController.updateAbbreviation
);

/**
 * DELETE /api/abbreviations/:id
 * Delete abbreviation (admin only).
 */
router.delete(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    validateObjectId(),
    abbreviationController.deleteAbbreviation
);

/**
 * POST /api/abbreviations/bulk
 * Bulk upload abbreviations (admin only).
 */
router.post(
    '/bulk',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    abbreviationController.bulkUpload
);

module.exports = router;
