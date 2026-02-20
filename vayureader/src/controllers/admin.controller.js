/**
 * Admin Controller
 * 
 * Handles admin authentication and sub-admin management business logic.
 * 
 * @module controllers/admin.controller
 */

const Admin = require('../models/Admin');
const { generateAdminToken } = require('../services/jwt.service');
const { generateOtp, generateLoginToken, saveOtp, verifyOtp, deleteOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { hashPassword, comparePassword } = require('../services/password.service');
const { logAction, RESOURCE_TYPES, ACTION_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName, escapeRegex } = require('../utils/sanitize');
const { server } = require('../config/environment');
const { redisClient } = require('../config/redis');

// =============================================================================
// AUTHENTICATION (Password + OTP 2FA with Login Token)
// =============================================================================

/**
 * Step 1: Verify password and send OTP.
 * Requires: contact (phone) + password
 * Returns: loginToken (used for OTP verification)
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { password } = req.body;

        if (!contact || !password) {
            return response.badRequest(res, 'Contact and password are required');
        }

        // Find admin by contact
        const admin = await Admin.findOne({ contact });

        if (!admin) {

            // Use generic message to prevent user enumeration
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Verify password (Factor 1: Something you know)
        const isPasswordValid = await comparePassword(password, admin.passwordHash);


        if (!isPasswordValid) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Generate login token - this will be used to encrypt OTP
        const loginToken = generateLoginToken();

        // Password correct - Generate and send OTP (Factor 2: Something you have)
        const otp = generateOtp();
        await saveOtp(contact, otp, loginToken); // OTP encrypted with login token + deviceId stored separately

        // Send OTP via SMS (Asynchronously)
        sendOtpSms(contact, otp).catch(err => {
            console.error(`[SMS Error] Background sending failed for admin ${contact}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        const responseData = {
            message: isDevMode
                ? 'Password verified. OTP generated (DEV MODE - SMS skipped)'
                : 'Password verified. OTP sent to your phone',
            loginToken // Return login token to client
        };

        if (isDevMode) {
            responseData.otp = otp;
        }

        response.success(res, responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * Step 2: Verify OTP and complete admin login.
 * Requires: contact (phone) + otp + loginToken
 * Returns: JWT token as HTTP-only cookie + admin info
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { otp, loginToken } = req.body;

        if (!contact || !otp || !loginToken) {
            return response.badRequest(res, 'Contact, OTP, loginToken, and deviceId are required');
        }

        const admin = await Admin.findOne({ contact });

        if (!admin) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Verify OTP from Redis using login token (Factor 2: Something you have) + deviceId
        const verification = await verifyOtp(otp, contact, loginToken);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP from Redis - Handled in verifyOtp service
        // await deleteOtp(contact);

        const token = generateAdminToken(admin);

        // Set JWT as HTTP-only cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const isTesting = server.isTesting;
        res.cookie('admin_token', token, {
            httpOnly: true,           // Prevents JavaScript access
            secure: isProduction || isTesting,  // HTTPS required for SameSite=none
            sameSite: isTesting ? 'none' : 'lax',       // CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
        });

        response.success(res, {
            admin: admin.toSafeObject(),
            token
        }, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// =============================================================================
// SUB-ADMIN MANAGEMENT
// =============================================================================

/**
 * Get all sub-admins.
 */
const getAllSubAdmins = async (req, res, next) => {
    try {
        const admins = await Admin.find({})
            .sort({ createdAt: -1 })
            .select('name contact permissions isVerified createdBy createdAt updatedAt')
            .lean();

        response.success(res, admins);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new sub-admin.
 * Requires password for the new admin.
 */
const createSubAdmin = async (req, res, next) => {
    try {
        const { name, contact, permissions, password } = req.body;
        const normalizedContact = sanitizePhone(contact);

        if (!password || password.length < 8) {
            return response.badRequest(res, 'Password must be at least 8 characters');
        }

        // Check for existing admin
        const existing = await Admin.findOne({ contact: normalizedContact });
        if (existing) {
            return response.conflict(res, 'Admin with this contact already exists');
        }

        // Validate permissions
        const validPermissions = permissions && Array.isArray(permissions)
            ? permissions.filter(p => Admin.PERMISSIONS.includes(p))
            : [];

        // RBAC Security Check: Prevent privilege escalation
        // Admins cannot grant permissions they don't possess
        const hasAllPermissions = validPermissions.every(p => req.admin.permissions.includes(p));
        if (!hasAllPermissions) {
            return response.forbidden(res, 'You cannot grant permissions you do not possess');
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        const newAdmin = new Admin({
            name: sanitizeName(name),
            contact: normalizedContact,
            permissions: validPermissions,
            createdBy: req.admin.name,
            passwordHash
        });

        await newAdmin.save();

        await logAction(
            ACTION_TYPES.CREATE,
            RESOURCE_TYPES.ADMIN,
            newAdmin._id,
            req.admin,
            { name: newAdmin.name }
        );

        response.created(res, newAdmin.toSafeObject(), 'Sub-admin created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update a sub-admin's permissions.
 */
const updateSubAdmin = async (req, res, next) => {
    try {
        const { permissions } = req.body;
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return response.notFound(res, 'Sub-admin not found');
        }



        // Validate permissions
        const validPermissions = permissions && Array.isArray(permissions)
            ? permissions.filter(p => Admin.PERMISSIONS.includes(p))
            : [];

        // RBAC Security Check: Prevent privilege escalation
        // Admins cannot grant permissions they don't possess
        const hasAllPermissions = validPermissions.every(p => req.admin.permissions.includes(p));
        if (!hasAllPermissions) {
            return response.forbidden(res, 'You cannot grant permissions you do not possess');
        }

        const oldPermissions = admin.permissions;
        admin.permissions = validPermissions;
        await admin.save();

        await logAction(
            ACTION_TYPES.UPDATE,
            RESOURCE_TYPES.ADMIN,
            admin._id,
            req.admin,
            {
                name: admin.name,
                oldPermissions,
                newPermissions: validPermissions
            }
        );

        response.success(res, admin.toSafeObject(), 'Sub-admin updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a sub-admin.
 */
const deleteSubAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return response.notFound(res, 'Sub-admin not found');
        }



        await Admin.findByIdAndDelete(req.params.id);

        await logAction(
            ACTION_TYPES.DELETE,
            RESOURCE_TYPES.ADMIN,
            req.params.id,
            req.admin,
            { name: admin.name }
        );

        response.success(res, null, 'Sub-admin deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single sub-admin by ID.
 */
const getSubAdminById = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return response.notFound(res, 'Sub-admin not found');
        }

        response.success(res, admin.toSafeObject());
    } catch (error) {
        next(error);
    }
};

// =============================================================================
// USER MANAGEMENT (Admin creates users)
// =============================================================================

/**
 * Create a new user (admin pre-registration).
 * User will need to set security questions on first login.
 */
const createUser = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const { name, phone_number } = req.body;
        const normalizedPhone = sanitizePhone(phone_number);

        if (!normalizedPhone) {
            return response.badRequest(res, 'Valid phone number is required');
        }

        // Check for existing user
        const existing = await User.findOne({ phone_number: normalizedPhone });
        if (existing) {
            return response.conflict(res, 'User with this phone number already exists');
        }

        const newUser = new User({
            name: sanitizeName(name),
            phone_number: normalizedPhone,
            isVerified: false, // Must set security questions before full auth
            createdByAdmin: req.admin.adminId
        });

        await newUser.save();

        response.created(res, {
            id: newUser._id,
            name: newUser.name,
            phone_number: newUser.phone_number,
            isVerified: newUser.isVerified
        }, 'User created successfully. User must set security questions on first login.');
    } catch (error) {
        next(error);
    }
};

/**
 * Get all users (paginated).
 */
const getAllUsers = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const { page = 1, limit = 50, search } = req.query;

        const filter = {};
        if (search) {
            const safeSearch = escapeRegex(search);
            filter.$or = [
                { name: { $regex: safeSearch, $options: 'i' } },
                { phone_number: { $regex: safeSearch, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = Math.min(parseInt(limit), 100);

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select('-securityQuestions')
                .lean(),
            User.countDocuments(filter)
        ]);

        response.success(res, {
            users,
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current authenticated admin info.
 * Used for session validation on page reload.
 */
const getCurrentAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.admin.adminId);
        if (!admin) {
            return response.unauthorized(res, 'Admin account no longer exists');
        }

        const token = generateAdminToken(admin);
        response.success(res, {
            adminId: admin._id,
            ...admin.toSafeObject(),
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout admin by invalidating current token session and clearing cookie.
 */
const logout = async (req, res, next) => {
    try {
        const adminId = req.admin?.adminId;

        if (!adminId) {
            return response.unauthorized(res, 'No token provided');
        }

        const admin = await Admin.findByIdAndUpdate(
            adminId,
            { $inc: { tokenVersion: 1 } }
        );

        if (!admin) {
            return response.unauthorized(res, 'Admin account no longer exists');
        }

        // Clear short-lived auth cache used by unifiedAuth.
        const cacheKey = `auth_admin:${adminId}`;
        try {
            await redisClient.del(cacheKey);
        } catch (cacheError) {
            console.warn('Failed to clear admin auth cache on logout:', cacheError.message);
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const isTesting = server.isTesting;
        res.clearCookie('admin_token', {
            httpOnly: true,
            secure: isProduction || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            path: '/'
        });
        response.success(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requestLoginOtp,
    verifyLoginOtp,
    logout,
    getCurrentAdmin,
    getAllSubAdmins,
    createSubAdmin,
    updateSubAdmin,
    deleteSubAdmin,
    getSubAdminById,
    createUser,
    getAllUsers
};
