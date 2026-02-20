/**
 * Word Model
 * 
 * Represents dictionary words with meanings, synonyms, and antonyms.
 * 
 * @module models/Word
 */

const mongoose = require('mongoose');

/**
 * Schema for individual word meanings.
 */
const meaningSchema = new mongoose.Schema(
    {
        partOfSpeech: {
            type: String,
            trim: true
        },
        definition: {
            type: String,
            required: true,
            trim: true
        },
        synonyms: [String],
        examples: [String]
    },
    { _id: false }
);

const wordSchema = new mongoose.Schema(
    {
        /**
         * The word itself (stored uppercase for consistency).
         */
        word: {
            type: String,
            required: [true, 'Word is required'],
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },

        /**
         * Array of meanings (definitions).
         */
        meanings: {
            type: [meaningSchema],
            required: [true, 'At least one meaning is required'],
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Word must have at least one meaning'
            }
        },

        /**
         * Word-level synonyms.
         */
        synonyms: [String],

        /**
         * Word antonyms.
         */
        antonyms: [String]
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

// word index is handled in schema definition (index: true)

module.exports = mongoose.model('Word', wordSchema);
