/**
 * Thumbnail Service
 * 
 * Generates PDF thumbnails server-side using poppler-utils (pdftoppm).
 * This removes the need for the frontend to generate and upload thumbnails.
 * 
 * @module services/thumbnail.service
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const execFileAsync = promisify(execFile);

// Thumbnail defaults
const THUMBNAIL_SCALE = 600;  // Max dimension in pixels (width or height)
const THUMBNAIL_FORMAT = 'jpeg';

/**
 * Generate a JPEG thumbnail from the first page of a PDF file.
 * Uses `pdftoppm` from poppler-utils (installed in Docker image).
 * 
 * @param {string} pdfPath - Absolute path to the PDF file on disk
 * @param {string} outputDir - Directory to save the thumbnail
 * @returns {Promise<{thumbnailPath: string, thumbnailFilename: string}>}
 */
const generateThumbnail = async (pdfPath, outputDir) => {
    const thumbnailId = uuidv4();
    // pdftoppm appends the page number as a suffix, e.g., output-1.jpg
    const outputPrefix = path.join(outputDir, thumbnailId);

    try {
        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // pdftoppm args:
        //   -jpeg          → output JPEG format
        //   -f 1           → first page only
        //   -singlefile    → don't append page number suffix
        //   -scale-to <N>  → scale longest dimension to N pixels
        //   <input.pdf> <output_prefix>
        await execFileAsync('pdftoppm', [
            `-${THUMBNAIL_FORMAT}`,
            '-f', '1',
            '-singlefile',
            '-scale-to', String(THUMBNAIL_SCALE),
            pdfPath,
            outputPrefix
        ], {
            timeout: 15000  // 15 second timeout
        });

        // pdftoppm outputs: <prefix>.jpg (with -singlefile and -jpeg)
        const ext = THUMBNAIL_FORMAT === 'jpeg' ? 'jpg' : THUMBNAIL_FORMAT;
        const thumbnailFilename = `${thumbnailId}.${ext}`;
        const thumbnailPath = `${outputPrefix}.${ext}`;

        // Verify the file was actually created
        await fs.access(thumbnailPath);

        return {
            thumbnailPath,
            thumbnailFilename
        };
    } catch (error) {
        // Clean up partial output on failure
        const ext = THUMBNAIL_FORMAT === 'jpeg' ? 'jpg' : THUMBNAIL_FORMAT;
        await fs.unlink(`${outputPrefix}.${ext}`).catch(() => { });

        if (error.killed) {
            throw new Error('Thumbnail generation timed out (PDF may be too complex)');
        }

        console.error('[Thumbnail] Generation failed:', error.message);
        throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
};

module.exports = {
    generateThumbnail
};
