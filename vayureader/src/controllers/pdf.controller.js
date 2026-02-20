/**
 * PDF Controller
 * 
 * Handles PDF document CRUD business logic.
 * 
 * @module controllers/pdf.controller
 */

const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { createReadStream } = require('fs');
const PdfDocument = require('../models/PdfDocument');
const { logCreate, logUpdate, logDelete, logRead, RESOURCE_TYPES } = require('../services/audit.service');
const { publishPdfEvent, PDF_EVENTS } = require('../services/pubsub.service');
const { logPdfRead } = require('../services/userAudit.service');
const response = require('../utils/response');
const { escapeRegex } = require('../utils/sanitize');
const { validateFileType, ALLOWED_TYPES, validateExtensionMatchesContent, validateSafeFilename } = require('../utils/fileValidator');
const { generateThumbnail } = require('../services/thumbnail.service');

const { redisClient } = require('../config/redis');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    PDF_METADATA: 3600,      // 1 hour for individual PDF metadata
    CATEGORIES: 3600,        // 1 hour for categories list
    PDF_LIST: 1800,          // 30 minutes for PDF listings
    SEARCH_RESULTS: 900      // 15 minutes for search results
};

/**
 * Search PDFs with optional query and pagination.
 * Query params: search, page (default 1), limit (default 50, max 200)
 */
const searchPdfs = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            const safeSearch = escapeRegex(search);
            query = {
                $or: [
                    { title: { $regex: safeSearch, $options: 'i' } },
                    { content: { $regex: safeSearch, $options: 'i' } },
                    { category: { $regex: safeSearch, $options: 'i' } }
                ]
            };
        }

        const [documents, total] = await Promise.all([
            PdfDocument.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PdfDocument.countDocuments(query)
        ]);

        response.success(res, {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllPdfs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;
        const { category } = req.query;

        const query = {};
        if (category) {
            query.category = category;
        }

        const [documents, total] = await Promise.all([
            PdfDocument.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PdfDocument.countDocuments(query)
        ]);

        response.success(res, {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get distinct PDF categories.
 * Cached for 1 hour.
 */
const getCategories = async (req, res, next) => {
    try {
        const cacheKey = 'pdf:categories';

        // Check cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        const categories = await PdfDocument.distinct('category');
        const result = categories.filter(c => c).sort();

        // Cache for 1 hour
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.CATEGORIES });

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single PDF and increment view count.
 */
const getPdfById = async (req, res, next) => {
    try {
        let pdf;

        // If admin, just fetch without incrementing view count
        if (req.admin) {
            pdf = await PdfDocument.findById(req.params.id);
        } else {
            // If user (or public), increment view count
            pdf = await PdfDocument.findByIdAndUpdate(
                req.params.id,
                { $inc: { viewCount: 1 } },
                { new: true }
            );
        }

        if (!pdf) {
            return response.notFound(res, 'PDF not found');
        }

        // Log PDF read event for authenticated users (all details from JWT)
        if (req.user && req.user.userId) {
            logPdfRead(
                { userId: req.user.userId, phone_number: req.user.phone_number },
                req.user.deviceId,
                { pdfId: pdf._id.toString(), title: pdf.title }
            );
        }



        response.success(res, pdf);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single PDF for Admin (NO view count increment).
 */
const getAdminPdfById = async (req, res, next) => {
    try {
        const pdf = await PdfDocument.findById(req.params.id);

        if (!pdf) {
            return response.notFound(res, 'PDF not found');
        }

        response.success(res, pdf);
    } catch (error) {
        next(error);
    }
};

/**
 * Upload new PDF.
 */
const uploadPdf = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        const pdfFile = req.file;

        if (!pdfFile) {
            return response.badRequest(res, 'PDF file is required');
        }

        if (!title) {
            return response.badRequest(res, 'Title is required');
        }

        // Security: Validate original filename for path traversal
        const pdfNameCheck = validateSafeFilename(pdfFile.originalname);
        if (!pdfNameCheck.valid) {
            await fs.unlink(pdfFile.path).catch(() => { });
            return response.badRequest(res, `PDF file rejected: ${pdfNameCheck.error}`);
        }

        // Security Check: Validate Magic Bytes (File Content)
        const buffer = await fs.readFile(pdfFile.path);
        const validPdf = await validateFileType(buffer, ALLOWED_TYPES.pdf);
        if (!validPdf.valid) {
            await fs.unlink(pdfFile.path).catch(() => { });
            return response.badRequest(res, `Invalid PDF file content. Detected: ${validPdf.type ? validPdf.type.mime : 'unknown'}`);
        }

        // Security: Cross-check extension vs actual content (catches .exe renamed to .pdf)
        const extCheck = await validateExtensionMatchesContent(pdfFile.originalname, buffer);
        if (!extCheck.valid) {
            await fs.unlink(pdfFile.path).catch(() => { });
            return response.badRequest(res, `Security Warning: ${extCheck.error}`);
        }

        const pdfUrl = `/uploads/${req.folderName}/${pdfFile.filename}`;

        // Auto-generate thumbnail from PDF page 1 (server-side)
        let thumbnail;
        try {
            const uploadDir = path.join(__dirname, '..', '..', 'uploads', req.folderName);
            const result = await generateThumbnail(pdfFile.path, uploadDir);
            thumbnail = `/uploads/${req.folderName}/${result.thumbnailFilename}`;
        } catch (thumbError) {
            console.warn('[Thumbnail] Auto-generation failed, saving PDF without thumbnail:', thumbError.message);
            // PDF upload still succeeds even if thumbnail generation fails
        }

        const newDoc = new PdfDocument({
            title,
            content,
            pdfUrl,
            category,
            thumbnail,
            viewCount: 0
        });

        await newDoc.save();

        await logCreate(RESOURCE_TYPES.PDF, newDoc._id, req.admin, {
            title: newDoc.title,
            category: newDoc.category
        });

        // Publish real-time event with only ID (user fetches details via authenticated endpoint)
        await publishPdfEvent(PDF_EVENTS.ADDED, {
            id: newDoc._id.toString()
        });

        // Invalidate categories cache
        await redisClient.del('pdf:categories');

        response.created(res, newDoc, 'PDF uploaded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update PDF.
 */
const updatePdf = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        const pdfFile = req.file;

        const oldDoc = await PdfDocument.findById(req.params.id);
        if (!oldDoc) {
            return response.notFound(res, 'PDF not found');
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (category !== undefined) updateData.category = category;

        if (pdfFile) {
            // Security: Validate filename for path traversal
            const nameCheck = validateSafeFilename(pdfFile.originalname);
            if (!nameCheck.valid) {
                await fs.unlink(pdfFile.path).catch(() => { });
                return response.badRequest(res, `PDF file rejected: ${nameCheck.error}`);
            }

            // Security Check: Validate PDF magic bytes
            const buffer = await fs.readFile(pdfFile.path);
            const validPdf = await validateFileType(buffer, ALLOWED_TYPES.pdf);
            if (!validPdf.valid) {
                await fs.unlink(pdfFile.path).catch(() => { });
                return response.badRequest(res, `Invalid PDF file content. Detected: ${validPdf.type ? validPdf.type.mime : 'unknown'}`);
            }

            // Security: Cross-check extension vs actual content
            const extCheck = await validateExtensionMatchesContent(pdfFile.originalname, buffer);
            if (!extCheck.valid) {
                await fs.unlink(pdfFile.path).catch(() => { });
                return response.badRequest(res, `Security Warning: ${extCheck.error}`);
            }

            updateData.pdfUrl = `/uploads/${req.folderName}/${pdfFile.filename}`;

            // Auto-generate new thumbnail from the new PDF
            try {
                const uploadDir = path.join(__dirname, '..', '..', 'uploads', req.folderName);
                const result = await generateThumbnail(pdfFile.path, uploadDir);
                updateData.thumbnail = `/uploads/${req.folderName}/${result.thumbnailFilename}`;
            } catch (thumbError) {
                console.warn('[Thumbnail] Auto-generation failed during update:', thumbError.message);
            }
        }

        const updated = await PdfDocument.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Clean up old files that were replaced
        if (pdfFile && oldDoc.pdfUrl) {
            const oldPdfPath = path.join(__dirname, '..', '..', oldDoc.pdfUrl);
            fs.unlink(oldPdfPath).catch(() => { });
        }
        if (pdfFile && oldDoc.thumbnail) {
            // If we uploaded a new PDF, the old thumbnail is stale
            const oldThumbPath = path.join(__dirname, '..', '..', oldDoc.thumbnail);
            fs.unlink(oldThumbPath).catch(() => { });
        }

        await logUpdate(RESOURCE_TYPES.PDF, updated._id, req.admin, {
            old: { title: oldDoc.title },
            new: { title: updated.title }
        });

        // Publish real-time event with only ID (user fetches details via authenticated endpoint)
        await publishPdfEvent(PDF_EVENTS.UPDATED, {
            id: updated._id.toString()
        });

        // Invalidate categories cache
        await redisClient.del('pdf:categories');

        response.success(res, updated, 'PDF updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete PDF (async file operations).
 */
const deletePdf = async (req, res, next) => {
    try {
        const pdf = await PdfDocument.findById(req.params.id);

        if (!pdf) {
            return response.notFound(res, 'PDF not found');
        }

        // Delete files asynchronously (non-blocking)
        const deleteFile = async (filePath) => {
            try {
                await fs.unlink(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting file:', filePath, err.message);
                }
            }
        };

        const deleteEmptyFolder = async (folderPath) => {
            try {
                const files = await fs.readdir(folderPath);
                if (files.length === 0) {
                    await fs.rmdir(folderPath);
                }
            } catch (err) {
                // Ignore folder deletion errors
            }
        };

        // Delete files in parallel
        const deleteTasks = [];
        if (pdf.pdfUrl) {
            const pdfPath = path.join(__dirname, '..', '..', pdf.pdfUrl);
            deleteTasks.push(deleteFile(pdfPath).then(() => deleteEmptyFolder(path.dirname(pdfPath))));
        }
        if (pdf.thumbnail) {
            const thumbPath = path.join(__dirname, '..', '..', pdf.thumbnail);
            deleteTasks.push(deleteFile(thumbPath));
        }

        // Don't wait for file deletion to complete - fire and forget
        Promise.all(deleteTasks).catch(err => {
            console.error('Background file deletion error:', err.message);
        });

        await PdfDocument.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.PDF, req.params.id, req.admin, {
            title: pdf.title
        });

        // Publish real-time event
        await publishPdfEvent(PDF_EVENTS.DELETED, {
            id: req.params.id,
            title: pdf.title
        });

        // Invalidate categories cache
        await redisClient.del('pdf:categories');

        response.success(res, null, 'PDF deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Serve a PDF file after authentication.
 * The file path is validated against the database to ensure it belongs to a real document.
 * This prevents direct unauthenticated access to uploaded files.
 */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const serveFile = async (req, res, next) => {
    try {
        // Security: Block path traversal in URL params
        const { folder, filename } = req.params;
        if (folder.includes('..') || folder.includes('/') || folder.includes('\\') || folder.includes('\0')) {
            return response.badRequest(res, 'Invalid folder path');
        }
        const filenameCheck = validateSafeFilename(filename);
        if (!filenameCheck.valid) {
            return response.badRequest(res, `Invalid filename: ${filenameCheck.error}`);
        }

        // Reconstruct the URL path from params
        const requestedPath = `/uploads/${folder}/${filename}`;
        const cacheKey = `file_auth:${requestedPath}`;

        let meta;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            meta = JSON.parse(cachedData);
        } else {
            // Validate that this file belongs to a real PDF document
            const pdf = await PdfDocument.findOne({
                $or: [
                    { pdfUrl: requestedPath },
                    { thumbnail: requestedPath }
                ]
            }).lean();

            if (!pdf) {
                return response.notFound(res, 'File not found');
            }

            // Determine content type
            const ext = path.extname(req.params.filename).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            meta = {
                valid: true,
                contentType: contentType
            };

            // Cache for short TTL (1 hour)
            await redisClient.set(cacheKey, JSON.stringify(meta), { EX: 3600 });
        }

        const internalPath = `/internal-uploads/${req.params.folder}/${req.params.filename}`;

        // Offload file transfer to Nginx internal location via X-Accel-Redirect
        // Nginx will handle range requests, caching headers, and synchronous fs reads natively
        res.setHeader('Content-Type', meta.contentType);
        res.setHeader('X-Accel-Redirect', internalPath);
        res.end();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchPdfs,
    getAllPdfs,
    getPdfById,
    getAdminPdfById,
    uploadPdf,
    updatePdf,
    deletePdf,
    getCategories,
    serveFile
};
