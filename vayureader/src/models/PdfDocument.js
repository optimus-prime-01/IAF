/**
 * PdfDocument Model
 * 
 * Represents PDF documents stored in the system.
 * 
 * @module models/PdfDocument
 */

const mongoose = require('mongoose');

const pdfDocumentSchema = new mongoose.Schema(
    {
        /**
         * Document title.
         */
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [500, 'Title cannot exceed 500 characters']
        },

        /**
         * Document description or content summary.
         */
        content: {
            type: String,
            trim: true
        },

        /**
         * URL/path to the PDF file.
         */
        pdfUrl: {
            type: String,
            required: [true, 'PDF URL is required']
        },

        /**
         * Document category for organization.
         */
        category: {
            type: String,
            trim: true,
            index: true
        },

        /**
         * Number of times this document has been viewed.
         */
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },

        /**
         * URL/path to thumbnail image.
         */
        thumbnail: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

// Text index for search functionality
pdfDocumentSchema.index({ title: 'text', content: 'text' });
// category index is handled in schema definition (index: true)
pdfDocumentSchema.index({ createdAt: -1 });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Increments the view count.
 */
pdfDocumentSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return this.save();
};

module.exports = mongoose.model('PdfDocument', pdfDocumentSchema);
