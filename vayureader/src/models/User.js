/**
 * User Model
 * 
 * Represents application users who authenticate via OTP.
 * 
 * @module models/User
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        /**
         * User's full name.
         */
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters']
        },

        /**
         * Phone number (unique identifier for login).
         */
        phone_number: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
            index: true
        },

        /**
         * Current device ID bound to this user.
         */
        deviceId: {
            type: String,
            trim: true,
            index: true
        },

        /**
         * Previous device ID (stored when device changes for audit trail).
         */
        previousDeviceId: {
            type: String,
            trim: true
        },

        /**
         * Last login timestamp.
         */
        lastLogin: {
            type: Date
        },

        /**
         * Whether the user is blocked from logging in.
         */
        isBlocked: {
            type: Boolean,
            default: false
        },

        /**
         * Whether user has completed security setup (security questions set).
         * Users created by admin must set security questions before full auth.
         */
        isVerified: {
            type: Boolean,
            default: true // Existing self-registered users are verified by default
        },

        /**
         * Security questions for password recovery.
         * Array of question/answer pairs with bcrypt hashed answers.
         */
        securityQuestions: [{
            question: {
                type: String,
                trim: true
            },
            answerHash: {
                type: String
            }
        }],

        /**
         * Reference to admin who created this user (for pre-registration).
         * Null for self-registered users.
         */
        createdByAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

// phone_number index is handled in schema definition (index: true)

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Returns safe user object for API responses.
 */
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        name: this.name,
        phone_number: this.phone_number,
        deviceId: this.deviceId
    };
};

module.exports = mongoose.model('User', userSchema);
