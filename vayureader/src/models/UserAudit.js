/**
 * UserAudit Model
 * 
 * Records user activities for auditing and analytics.
 * Separate from admin AuditLog to track user-specific events.
 * 
 * @module models/UserAudit
 */

const mongoose = require('mongoose');

/**
 * User action types that can be audited.
 */
const USER_ACTIONS = {
    LOGIN: 'LOGIN',
    DEVICE_CHANGE: 'DEVICE_CHANGE',
    NAME_CHANGE: 'NAME_CHANGE',
    READ_PDF: 'READ_PDF'
};

const userAuditSchema = new mongoose.Schema(
    {
        /**
         * Reference to the user.
         */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        /**
         * Denormalized phone number for easier querying.
         */
        phone_number: {
            type: String,
            required: true,
            index: true
        },

        /**
         * Type of action performed.
         */
        action: {
            type: String,
            required: true,
            enum: Object.values(USER_ACTIONS),
            index: true
        },

        /**
         * Device ID from which the action was performed.
         */
        deviceId: {
            type: String,
            trim: true,
            index: true
        },

        /**
         * Additional details about the action.
         * For DEVICE_CHANGE: { previousDeviceId, newDeviceId }
         * For READ_PDF: { pdfId, title }
         */
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        /**
         * Timestamp of when the action occurred.
         */
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

userAuditSchema.index({ timestamp: -1 });
userAuditSchema.index({ userId: 1, action: 1 });
userAuditSchema.index({ phone_number: 1, timestamp: -1 });
userAuditSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('UserAudit', userAuditSchema);
module.exports.USER_ACTIONS = USER_ACTIONS;
