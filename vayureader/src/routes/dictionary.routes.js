/**
 * Dictionary Routes
 * 
 * Defines routes for dictionary word operations.
 * Business logic is in dictionary.controller.js.
 * 
 * @module routes/dictionary.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const dictionaryController = require('../controllers/dictionary.controller');

// Middleware
const { unifiedAuth, authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const { validateObjectId, trimFields, requireFields } = require('../middleware/validate');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/dictionary/word/:word
 * Look up a word and get related words.
 */
router.get(
    '/word/:word',
    dictionaryController.lookupWord
);

/**
 * GET /api/dictionary/search
 * GET /api/dictionary/search/:term
 * Search words (Public).
 */
router.get(
    '/search/:term?',
    dictionaryController.searchWords
);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * GET /api/dictionary/words
 * Get first 100 words.
 */
router.get(
    '/words',
    unifiedAuth,
    dictionaryController.getWords
);

/**
 * GET /api/dictionary/words/all
 * Get all words (admin view).
 */
router.get(
    '/words/all',
    unifiedAuth,
    dictionaryController.getAllWords
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * POST /api/dictionary
 * Add a new word (admin only).
 */
router.post(
    '/',
    authenticateAdmin,
    requirePermission('manage_dictionary'),
    trimFields,
    requireFields(['word', 'meanings']),
    dictionaryController.createWord
);

/**
 * PUT /api/dictionary/:id
 * Update a word (admin only).
 */
router.put(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_dictionary'),
    validateObjectId(),
    trimFields,
    dictionaryController.updateWord
);

/**
 * DELETE /api/dictionary/:id
 * Delete a word (admin only).
 */
router.delete(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_dictionary'),
    validateObjectId(),
    dictionaryController.deleteWord
);

/**
 * POST /api/dictionary/upload
 * Bulk upload dictionary (admin only).
 */
router.post(
    '/upload',
    authenticateAdmin,
    requirePermission('manage_dictionary'),
    dictionaryController.uploadDictionary
);

/**
 * GET /api/dictionary/export
 * Export all words (admin only).
 */
router.get(
    '/export/all',
    authenticateAdmin,
    requirePermission('manage_dictionary'),
    dictionaryController.exportDictionary
);

module.exports = router;
