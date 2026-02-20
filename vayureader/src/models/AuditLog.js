/**
 * AuditLog Model
 * 
 * Records administrative actions for accountability and compliance.
 * 
 * @module models/AuditLog
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        /**
         * Type of action performed.
         */
        action: {
            type: String,
            required: true,
            enum: ['CREATE', 'UPDATE', 'DELETE', 'READ']
        },

        /**
         * Type of resource affected.
         */
        resourceType: {
            type: String,
            required: true,
            enum: ['PDF', 'DICTIONARY_WORD', 'ABBREVIATION', 'ADMIN']
        },

        /**
         * ID of the affected resource.
         */
        resourceId: {
            type: String,
            required: true,
            index: true
        },

        /**
         * ID of the admin who performed the action.
         */
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },

        /**
         * Name of the admin (denormalized for easier querying).
         */
        adminName: {
            type: String,
            required: true
        },

        /**
         * Contact of the admin.
         */
        adminContact: {
            type: String,
            required: true
        },

        /**
         * Additional details about the action.
         * Can store old/new values for updates.
         */
        details: {
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

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ adminName: 1 });
auditLogSchema.index({ action: 1, resourceType: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
