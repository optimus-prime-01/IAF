/**
 * Abbreviation Model
 * 
 * Represents abbreviations and their full forms.
 * 
 * @module models/Abbreviation
 */

const mongoose = require('mongoose');

const abbreviationSchema = new mongoose.Schema(
    {
        /**
         * The abbreviation (e.g., "IAF").
         */
        abbreviation: {
            type: String,
            required: [true, 'Abbreviation is required'],
            unique: true,
            trim: true,
            uppercase: true,
            index: true
        },

        /**
         * The full form (e.g., "Indian Air Force").
         */
        fullForm: {
            type: String,
            required: [true, 'Full form is required'],
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

abbreviationSchema.index({ abbreviation: 'text', fullForm: 'text' });

module.exports = mongoose.model('Abbreviation', abbreviationSchema);
