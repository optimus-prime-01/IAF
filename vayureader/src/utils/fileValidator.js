/**
 * File Type Validation Utilities
 * 
 * Validates file types using magic bytes (file signatures) rather than
 * trusting Content-Type headers or file extensions.
 * 
 * @module utils/fileValidator
 */

const FileType = require('file-type');
const path = require('path');

/**
 * Allowed MIME types for different upload categories.
 */
const ALLOWED_TYPES = {
    pdf: ['application/pdf'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdfOrImage: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Validates a file buffer against allowed MIME types.
 * Uses magic bytes for security instead of trusting headers.
 * 
 * @param {Buffer} buffer - File buffer to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {Promise<{valid: boolean, type: Object|null, error: string|null}>}
 * 
 * @example
 * const result = await validateFileType(buffer, ALLOWED_TYPES.pdf);
 * if (!result.valid) {
 *   return res.status(400).json({ error: result.error });
 * }
 */
const validateFileType = async (buffer, allowedTypes) => {
    try {
        const type = await FileType.fromBuffer(buffer);

        if (!type) {
            return {
                valid: false,
                type: null,
                error: 'Unable to determine file type'
            };
        }

        if (!allowedTypes.includes(type.mime)) {
            return {
                valid: false,
                type,
                error: `File type ${type.mime} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
            };
        }

        return {
            valid: true,
            type,
            error: null
        };
    } catch (error) {
        return {
            valid: false,
            type: null,
            error: `File validation error: ${error.message}`
        };
    }
};

/**
 * Generates a safe filename with the correct extension based on detected type.
 * 
 * @param {string} originalName - Original filename
 * @param {Object} detectedType - Detected file type from file-type
 * @param {string} uuid - UUID for unique naming
 * @returns {string} - Safe filename
 */
const generateSafeFilename = (originalName, detectedType, uuid) => {
    // Use the extension from detected type, not from original filename
    const ext = detectedType ? `.${detectedType.ext}` : path.extname(originalName);
    return `${uuid}${ext}`;
};

/**
 * Checks if a file is a PDF.
 * 
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<boolean>}
 */
const isPdf = async (buffer) => {
    const result = await validateFileType(buffer, ALLOWED_TYPES.pdf);
    return result.valid;
};

/**
 * Checks if a file is an image.
 * 
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<boolean>}
 */
const isImage = async (buffer) => {
    const result = await validateFileType(buffer, ALLOWED_TYPES.image);
    return result.valid;
};

/**
 * Cross-validates file extension against detected magic bytes.
 * Catches spoofed files (e.g., .exe renamed to .pdf).
 * 
 * @param {string} originalName - Original filename
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<{valid: boolean, error: string|null, detectedType: Object|null}>}
 */
const validateExtensionMatchesContent = async (originalName, buffer) => {
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const type = await FileType.fromBuffer(buffer);

    if (!type) {
        return { valid: false, error: 'Unable to determine actual file type from content', detectedType: null };
    }

    // Map of expected extensions to allowed detected extensions
    const extensionMap = {
        pdf: ['pdf'],
        jpg: ['jpg', 'jpeg'],
        jpeg: ['jpg', 'jpeg'],
        png: ['png'],
        gif: ['gif'],
        webp: ['webp']
    };

    const allowedExts = extensionMap[ext];
    if (!allowedExts) {
        return { valid: false, error: `Unsupported file extension: .${ext}`, detectedType: type };
    }

    if (!allowedExts.includes(type.ext)) {
        return {
            valid: false,
            error: `File spoofing detected: Extension is .${ext} but actual content is ${type.mime} (.${type.ext})`,
            detectedType: type
        };
    }

    return { valid: true, error: null, detectedType: type };
};

/**
 * Validates that a filename is safe (no path traversal, no null bytes).
 * 
 * @param {string} filename - Filename to validate
 * @returns {{valid: boolean, error: string|null}}
 */
const validateSafeFilename = (filename) => {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: 'Filename is required' };
    }

    // Check for null bytes
    if (filename.includes('\0')) {
        return { valid: false, error: 'Filename contains null bytes' };
    }

    // Check for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return { valid: false, error: 'Path traversal detected in filename' };
    }

    // Check for hidden files
    if (filename.startsWith('.')) {
        return { valid: false, error: 'Hidden files are not allowed' };
    }

    return { valid: true, error: null };
};

module.exports = {
    ALLOWED_TYPES,
    validateFileType,
    generateSafeFilename,
    isPdf,
    isImage,
    validateExtensionMatchesContent,
    validateSafeFilename
};
