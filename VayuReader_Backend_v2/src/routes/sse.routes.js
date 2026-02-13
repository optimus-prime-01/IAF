/**
 * SSE Routes
 * 
 * Server-Sent Events endpoint for real-time PDF notifications.
 * 
 * @module routes/sse.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const sseController = require('../controllers/sse.controller');

// Middleware
const { unifiedAuth } = require('../middleware/adminAuth');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/events
 * Establish SSE connection for real-time PDF updates.
 * 
 * Authentication is required. Since browser EventSource doesn't support
 * custom headers, the token can be passed as a query parameter:
 *   /api/events?token=<jwt>
 * 
 * For React Native (react-native-sse), the token is sent via headers.
 * For browser admin dashboard, cookies are sent automatically with withCredentials.
 * 
 * Events:
 * - connected: Initial connection confirmation
 * - PDF_ADDED: New PDF uploaded
 * - PDF_UPDATED: Existing PDF modified
 * - PDF_DELETED: PDF removed
 */
router.get(
    '/',
    // Bridge query-param token into Authorization header for EventSource compatibility
    (req, res, next) => {
        if (req.query.token && !req.headers.authorization && !(req.cookies && (req.cookies.admin_token || req.cookies.auth_token))) {
            req.headers.authorization = `Bearer ${req.query.token}`;
        }
        next();
    },
    unifiedAuth,
    sseController.connectToEvents
);

module.exports = router;
