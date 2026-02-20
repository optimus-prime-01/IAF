/**
 * Recovery Controller
 * 
 * Handles password recovery via security questions.
 * 
 * @module controllers/recovery.controller
 */

const User = require('../models/User');
const { hashSecurityAnswers, verifySecurityAnswers, AVAILABLE_QUESTIONS } = require('../services/securityQuestion.service');
const { generateOtp, generateLoginToken, saveOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const response = require('../utils/response');
const { sanitizePhone } = require('../utils/sanitize');

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
 * Setup security questions for current user.
 * User must be authenticated via OTP first.
 * Required for users created by admin (isVerified = false).
 */
const setupSecurityQuestions = async (req, res, next) => {
    try {
        const { securityQuestions } = req.body;

        if (!Array.isArray(securityQuestions) || securityQuestions.length < 2) {
            return response.badRequest(res, 'At least 2 security questions are required');
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

        const user = await User.findById(req.user.userId);
        if (!user) {
            return response.notFound(res, 'User not found');
        }

        // Hash all answers
        const hashedQuestions = await hashSecurityAnswers(securityQuestions);

        // Update user
        user.securityQuestions = hashedQuestions;
        user.isVerified = true;
        await user.save();

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
 * Returns the user's security questions (without answers).
 */
const initiateRecovery = async (req, res, next) => {
    try {
        const phone_number = sanitizePhone(req.body.phone_number);

        if (!phone_number) {
            return response.badRequest(res, 'Phone number is required');
        }

        const user = await User.findOne({ phone_number });

        if (!user) {
            // Don't reveal if user exists
            return response.badRequest(res, 'Unable to initiate recovery for this phone number');
        }

        if (!user.securityQuestions || user.securityQuestions.length === 0) {
            return response.badRequest(res, 'No security questions set for this account');
        }

        // Return only the questions (not answers)
        const questions = user.securityQuestions.map(q => q.question);

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
 * If correct, sends OTP to the user's phone.
 */
const verifyRecoveryAnswers = async (req, res, next) => {
    try {
        const phone_number = sanitizePhone(req.body.phone_number);
        const { answers, deviceId } = req.body;

        if (!phone_number || !answers || !Array.isArray(answers)) {
            return response.badRequest(res, 'Phone number and answers are required');
        }

        if (!deviceId) {
            return response.badRequest(res, 'Device ID is required');
        }

        const user = await User.findOne({ phone_number });

        if (!user) {
            return response.badRequest(res, 'Invalid phone number');
        }

        if (!user.securityQuestions || user.securityQuestions.length === 0) {
            return response.badRequest(res, 'No security questions set');
        }

        // Verify answers
        const verification = await verifySecurityAnswers(answers, user.securityQuestions);

        if (!verification.valid) {
            return response.badRequest(res, verification.error || 'Security answers are incorrect');
        }

        // Answers correct - generate and send OTP for device binding
        const loginToken = generateLoginToken();
        const otp = generateOtp();
        await saveOtp(phone_number, otp, loginToken, deviceId.trim());

        // Send OTP via SMS
        sendOtpSms(phone_number, otp).catch(err => {
            console.error(`[SMS Error] Recovery OTP failed for ${phone_number}:`, err.message);
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

module.exports = {
    getQuestions,
    setupSecurityQuestions,
    initiateRecovery,
    verifyRecoveryAnswers
};
