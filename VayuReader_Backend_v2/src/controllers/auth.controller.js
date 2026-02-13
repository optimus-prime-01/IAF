/**
 * Authentication Controller
 * 
 * Handles user authentication business logic.
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { generateLifetimeUserToken } = require('../services/jwt.service');
const { generateOtp, generateLoginToken, saveOtp, verifyOtp, deleteOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { logLogin, logDeviceChange, logNameChange } = require('../services/userAudit.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName } = require('../utils/sanitize');
const { server } = require('../config/environment');

/**
 * Request OTP for user login.
 * Creates user if doesn't exist.
 * Generates a temporary loginToken for OTP encryption.
 * Device ID is NOT updated until after successful OTP verification.
 * Name can ONLY be set during initial registration, not changed afterwards.
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const name = sanitizeName(req.body.name);
        const { deviceId } = req.body;



        // Validate deviceId is provided
        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            return response.badRequest(res, 'Device ID is required');
        }

        const sanitizedDeviceId = deviceId.trim();

        // Find or create user (DO NOT update deviceId yet - wait for OTP verification)
        let user = await User.findOne({ phone_number: phoneNumber });
        let isNewUser = false;

        if (!user) {
            // New user - create but don't save deviceId yet (will be set after OTP verification)
            // Name is ONLY set during initial registration
            user = new User({ name, phone_number: phoneNumber });
            isNewUser = true;
        } else {
            if (user.isBlocked) {
                return response.unauthorized(res, 'Your account has been blocked. Please contact support.');
            }

            // Name changes are allowed but AUDITED for existing users
            if (name && user.name !== name) {
                console.log(`[AUTH] Name change - Phone: ${phoneNumber}, From: ${user.name}, To: ${name}`);
                // Log the name change for audit (allowed: true)
                logNameChange(user, sanitizedDeviceId, user.name, name, true);
                // Update the name
                user.name = name;
            }

            // DO NOT update deviceId here - this is the security fix!
            // DeviceId will only be updated after successful OTP verification
        }

        // Generate a temporary login token for OTP encryption (instead of deviceId)
        const loginToken = generateLoginToken();

        // Generate OTP and save to Redis (encrypted with loginToken, deviceId stored for verification)
        const otp = generateOtp();
        await saveOtp(phoneNumber, otp, loginToken, sanitizedDeviceId);

        // Save user (for new user creation or name updates)
        if (isNewUser || user.isModified('name')) {
            await user.save();
        }

        // Send OTP via SMS (Asynchronously)
        sendOtpSms(phoneNumber, otp).catch(err => {
            console.error(`[SMS Error] Background sending failed for ${phoneNumber}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        // Response - include loginToken for client to use in verification
        const responseData = {
            message: isDevMode
                ? 'OTP generated (DEV MODE - SMS skipped)'
                : 'OTP request received',
            loginToken // Client must send this back during verification
        };

        // Include OTP in dev mode for testing
        if (isDevMode) {
            responseData.otp = otp;
        }

        response.success(res, responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP and complete login.
 * Handles device binding and change detection.
 * Requires loginToken from OTP request for decryption.
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const { otp, deviceId, loginToken } = req.body;



        // Validate required fields
        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            return response.badRequest(res, 'Device ID is required');
        }

        if (!otp) {
            return response.badRequest(res, 'OTP is required');
        }

        if (!loginToken) {
            return response.badRequest(res, 'Login token is required. Please request OTP again.');
        }

        const sanitizedDeviceId = deviceId.trim();

        // Find user
        const user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            return response.badRequest(res, 'User not found. Please request OTP first.');
        }

        if (user.isBlocked) {
            return response.unauthorized(res, 'Your account has been blocked. Please contact support.');
        }

        // Verify OTP from Redis (decrypted using loginToken, deviceId verified separately)
        const verification = await verifyOtp(otp, phoneNumber, loginToken, sanitizedDeviceId);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP from Redis - Handled in verifyOtp service
        // await deleteOtp(phoneNumber);

        // Handle device binding and change detection
        const isNewUser = !user.deviceId;
        const isDeviceChange = user.deviceId && user.deviceId !== sanitizedDeviceId;

        if (isDeviceChange) {
            // Log device change with both old and new device IDs
            logDeviceChange(user, user.deviceId, sanitizedDeviceId);

            // Store the previous device ID for audit trail
            user.previousDeviceId = user.deviceId;
        }

        // Update user's device ID and last login
        user.deviceId = sanitizedDeviceId;
        user.lastLogin = new Date();
        await user.save();

        // Log login event
        logLogin(user, sanitizedDeviceId);

        // Generate lifetime JWT token with user details
        const token = generateLifetimeUserToken(user._id, {
            deviceId: sanitizedDeviceId,
            phone_number: user.phone_number,
            name: user.name
        });

        // Set HTTP-only cookie with long expiration
        const isTesting = server.isTesting;
        const oneHundredYearsMs = 100 * 365 * 24 * 60 * 60 * 1000;

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: oneHundredYearsMs,
            path: '/'
        });

        response.success(res, {
            user: user.toSafeObject(),
            token,
            isNewDevice: isNewUser,
            deviceChanged: isDeviceChange
        }, isDeviceChange ? 'Login successful (device changed)' : 'Login successful');
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user.
 * Clears the auth cookie.
 */
const logout = async (req, res, next) => {
    try {
        const isTesting = server.isTesting;
        res.cookie('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: 0,
            path: '/'
        });

        response.success(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user's profile.
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return response.notFound(res, 'User not found');
        }

        response.success(res, { user: user.toSafeObject() });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requestLoginOtp,
    verifyLoginOtp,
    getProfile,
    logout
};
