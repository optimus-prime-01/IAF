/**
 * Admin Recovery Controller
 * 
 * Handles password recovery via security questions for admins.
 * 
 * @module controllers/adminRecovery.controller
 */

const Admin = require('../models/Admin');
const { hashSecurityAnswers, verifySecurityAnswers, AVAILABLE_QUESTIONS } = require('../services/securityQuestion.service');
const { generateOtp, generateLoginToken, saveOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { verifyOtp, deleteOtp } = require('../services/otp.service');
const { hashPassword } = require('../services/password.service');
const { generateAdminToken } = require('../services/jwt.service');
const { logUpdate, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone } = require('../utils/sanitize');
const { server } = require('../config/environment');

/**
 * Get available security questions.
 */
const getQuestions = async (req, res, next) => {
    try {
        response.success(res, { questions: AVAILABLE_QUESTIONS });
    } catch (error) {
        next(error);
    }
};

/**
 * Setup security questions for current admin.
 * Admin must be authenticated via OTP first.
 * Required for admins with isVerified = false.
 */
const setupSecurityQuestions = async (req, res, next) => {
    try {
        const { securityQuestions } = req.body;

        if (!Array.isArray(securityQuestions) || securityQuestions.length < 3) {
            return response.badRequest(res, 'At least 3 security questions are required');
        }

        if (securityQuestions.length > 5) {
            return response.badRequest(res, 'Maximum 5 security questions allowed');
        }

        // Validate all questions have both fields
        for (const qa of securityQuestions) {
            if (!qa.question || !qa.answer) {
                return response.badRequest(res, 'Each security question must have a question and answer');
            }
            if (qa.answer.trim().length < 2) {
                return response.badRequest(res, 'Each answer must be at least 2 characters');
            }
        }

        const admin = await Admin.findById(req.admin.adminId);
        if (!admin) {
            return response.notFound(res, 'Admin not found');
        }

        // Hash all answers
        const hashedQuestions = await hashSecurityAnswers(securityQuestions);

        // Update admin
        admin.securityQuestions = hashedQuestions;
        admin.isVerified = true;
        await admin.save();

        await logUpdate(RESOURCE_TYPES.ADMIN, admin._id, req.admin, {
            message: 'Security questions set/updated'
        });

        response.success(res, {
            message: 'Security questions set successfully',
            isVerified: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate password recovery.
 * Returns the admin's security questions (without answers).
 */
const initiateRecovery = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);

        if (!contact) {
            return response.badRequest(res, 'Contact number is required');
        }

        const admin = await Admin.findOne({ contact });

        if (!admin) {
            // Don't reveal if admin exists
            return response.badRequest(res, 'Unable to initiate recovery for this contact');
        }

        if (!admin.securityQuestions || admin.securityQuestions.length === 0) {
            return response.badRequest(res, 'No security questions set for this account. Contact an admin.');
        }

        // Return only the questions (not answers)
        const questions = admin.securityQuestions.map(q => q.question);

        response.success(res, {
            questions,
            message: 'Please answer your security questions'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify security question answers.
 * If correct, sends OTP to the admin's contact.
 */
const verifyRecoveryAnswers = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { answers } = req.body;

        if (!contact || !answers || !Array.isArray(answers)) {
            return response.badRequest(res, 'Contact and answers are required');
        }

        const admin = await Admin.findOne({ contact });

        if (!admin) {
            return response.badRequest(res, 'Invalid contact');
        }

        if (!admin.securityQuestions || admin.securityQuestions.length === 0) {
            return response.badRequest(res, 'No security questions set');
        }

        // Verify answers
        const verification = await verifySecurityAnswers(answers, admin.securityQuestions);

        if (!verification.valid) {
            return response.badRequest(res, verification.error || 'Security answers are incorrect');
        }

        // Answers correct - generate and send OTP
        const loginToken = generateLoginToken();
        const otp = generateOtp();

        // Use contact as device ID for admin recovery
        await saveOtp(contact, otp, loginToken, `recovery-${contact}`);

        // Send OTP via SMS
        sendOtpSms(contact, otp).catch(err => {
            console.error(`[SMS Error] Admin recovery OTP failed for ${contact}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        const responseData = {
            message: isDevMode
                ? 'Security answers verified. OTP generated (DEV MODE)'
                : 'Security answers verified. OTP sent to your phone',
            loginToken
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
 * Step 3: Verify OTP and Reset Password.
 */
const resetPassword = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { otp, loginToken, newPassword } = req.body;

        if (!contact || !otp || !loginToken || !newPassword) {
            return response.badRequest(res, 'All fields are required');
        }

        if (newPassword.length < 8) {
            return response.badRequest(res, 'Password must be at least 8 characters long');
        }

        const admin = await Admin.findOne({ contact });
        if (!admin) {
            return response.badRequest(res, 'Invalid contact');
        }

        // Verify OTP using contact as device ID reference (as set in verifyRecoveryAnswers)
        const verification = await verifyOtp(otp, contact, loginToken, `recovery-${contact}`);

        if (!verification.valid) {
            return response.badRequest(res, verification.error || 'Invalid or expired OTP');
        }

        // Reset Password
        admin.passwordHash = await hashPassword(newPassword);
        admin.isVerified = true; // Ensure they are verified if they recover account
        await admin.save();

        // Audit Log: Password Reset
        // Since user is not logged in, we construct the admin object from the fetched doc
        await logUpdate(RESOURCE_TYPES.ADMIN, admin._id,
            { id: admin._id, name: admin.name, contact: admin.contact },
            { message: 'Password reset via account recovery' }
        );

        // Clear OTP - Handled in verifyOtp service
        // await deleteOtp(contact);

        // Auto-login: Generate JWT
        const token = generateAdminToken(admin);

        // Set Cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const isTesting = server.isTesting;
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: isProduction || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
        });

        response.success(res, {
            admin: admin.toSafeObject(),
            token,
            message: 'Password reset successful'
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getQuestions,
    setupSecurityQuestions,
    initiateRecovery,
    verifyRecoveryAnswers,
    resetPassword
};
