/**
 * Admin Model
 * 
 * Represents administrators with role-based permissions.
 * Includes both super admin and sub-admin support.
 * 
 * @module models/Admin
 */

const mongoose = require('mongoose');

/**
 * Available permissions for admins.
 */
const PERMISSIONS = [
    'manage_pdfs',
    'manage_dictionary',
    'manage_abbreviations',
    'manage_admins',
    'view_audit',
    'view_user_audit'
];

const adminSchema = new mongoose.Schema(
    {
        /**
         * Admin's full name.
         */
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters']
        },

        /**
         * Contact number (unique identifier for login).
         */
        contact: {
            type: String,
            required: [true, 'Contact is required'],
            unique: true,
            trim: true,
            index: true
        },

        /**
         * Whether this admin has super admin privileges.
         * Super admins can manage other admins.
         */
        isSuperAdmin: {
            type: Boolean,
            default: false
        },

        /**
         * Permissions granted to this admin.
         * Super admins have all permissions automatically.
         */
        permissions: {
            type: [String],
            enum: PERMISSIONS,
            default: []
        },

        /**
         * Who created this admin (for sub-admins).
         */
        createdBy: {
            type: String,
            default: 'System'
        },

        /**
         * Hashed password for 2FA authentication.
         * Required for login (Factor 1: Something you know).
         */
        passwordHash: {
            type: String,
            required: [true, 'Password is required']
        },

        /**
         * Whether admin has completed security question setup.
         * New admins must set security questions before accessing resources.
         */
        isVerified: {
            type: Boolean,
            default: false
        },

        /**
         * Security questions for password recovery.
         * Answers are hashed for security.
         */
        securityQuestions: [{
            question: { type: String, required: true },
            answerHash: { type: String, required: true }
        }]
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

// contact index is handled in schema definition (index: true)
adminSchema.index({ name: 1 });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Checks if admin has a specific permission.
 * 
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
adminSchema.methods.hasPermission = function (permission) {
    if (this.isSuperAdmin) return true;
    return this.permissions.includes(permission);
};

/**
 * Returns safe admin object for API responses.
 */
adminSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        name: this.name,
        contact: this.contact,
        isSuperAdmin: this.isSuperAdmin,
        permissions: this.isSuperAdmin ? PERMISSIONS : this.permissions,
        isVerified: this.isVerified
    };
};

// =============================================================================
// STATICS
// =============================================================================

adminSchema.statics.PERMISSIONS = PERMISSIONS;

module.exports = mongoose.model('Admin', adminSchema);
