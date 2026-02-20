/**
 * PDF Routes
 * 
 * Defines routes for PDF document operations.
 * Business logic is in pdf.controller.js.
 * 
 * @module routes/pdf.routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Get max upload size from environment (default 100MB)
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10) * 1024 * 1024;

// Controller
const pdfController = require('../controllers/pdf.controller');

// Middleware
const { unifiedAuth, authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const { validateObjectId, trimFields } = require('../middleware/validate');
const { ALLOWED_TYPES } = require('../utils/fileValidator');

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req.folderName) {
            req.folderName = uuidv4();
        }
        const uploadPath = path.join(UPLOAD_DIR, req.folderName);
        // Use async mkdir to prevent blocking the event loop
        fs.mkdir(uploadPath, { recursive: true }, (err) => {
            if (err) return cb(err);
            cb(null, uploadPath);
        });
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = [...ALLOWED_TYPES.pdf, ...ALLOWED_TYPES.image];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_UPLOAD_SIZE }
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/pdfs
 * Search PDFs with optional query.
 */
router.get(
    '/',
    unifiedAuth,
    pdfController.searchPdfs
);

/**
 * GET /api/pdfs/all
 * Get all PDFs.
 */
router.get(
    '/all',
    unifiedAuth,
    pdfController.getAllPdfs
);

/**
 * GET /api/pdfs/categories
 * Get distinct categories.
 */
router.get(
    '/categories',
    unifiedAuth,
    pdfController.getCategories
);

/**
 * GET /api/pdfs/:id
 * Get single PDF and increment view count.
 */
/**
 * GET /api/pdfs/admin/:id
 * Get single PDF details for Admin (NO view count increment).
 */
router.get(
    '/admin/:id',
    authenticateAdmin,
    validateObjectId(),
    pdfController.getAdminPdfById
);

/**
 * GET /api/pdfs/:id
 * Get single PDF and increment view count.
 */
router.get(
    '/:id',
    unifiedAuth,
    validateObjectId(),
    pdfController.getPdfById
);

/**
 * GET /api/pdfs/file/:folder/:filename
 * Serve uploaded files (PDFs and thumbnails) with authentication.
 * This replaces direct static file access to prevent unauthenticated downloads.
 */
router.get(
    '/file/:folder/:filename',
    unifiedAuth,
    pdfController.serveFile
);

/**
 * POST /api/pdfs/upload
 * Upload new PDF (admin only).
 */
router.post(
    '/upload',
    authenticateAdmin,
    requirePermission('manage_pdfs'),
    upload.single('pdf'),
    trimFields,
    pdfController.uploadPdf
);

/**
 * PUT /api/pdfs/:id
 * Update PDF (admin only).
 */
router.put(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_pdfs'),
    validateObjectId(),
    upload.single('pdf'),
    trimFields,
    pdfController.updatePdf
);

/**
 * DELETE /api/pdfs/:id
 * Delete PDF (admin only).
 */
router.delete(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_pdfs'),
    validateObjectId(),
    pdfController.deletePdf
);

module.exports = router;
