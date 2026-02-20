/**
 * User Audit Service
 * 
 * Handles logging of user activities for auditing and analytics.
 * 
 * @module services/userAudit.service
 */

const UserAudit = require('../models/UserAudit');
const { USER_ACTIONS } = require('../models/UserAudit');

/**
 * Logs a user action.
 * Non-blocking: will not throw errors to avoid breaking main flow.
 * 
 * @param {string} userId - User's MongoDB ObjectId
 * @param {string} phone_number - User's phone number
 * @param {string} action - Action type (LOGIN, DEVICE_CHANGE, READ_PDF)
 * @param {string} deviceId - Device ID from which action was performed
 * @param {Object} [metadata={}] - Additional details about the action
 */
const logUserAction = (userId, phone_number, action, deviceId, metadata = {}) => {
    try {
        const auditEntry = new UserAudit({
            userId,
            phone_number,
            action,
            deviceId,
            metadata,
            timestamp: new Date()
        });

        // Fire and forget - don't await, but catch errors
        auditEntry.save()
            .then(() => {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`📋 User Audit: ${action} by ${phone_number} on device ${deviceId}`);
                }
            })
            .catch(err => console.error('⚠️ User audit logging failed:', err.message));

    } catch (error) {
        console.error('⚠️ User audit setup failed:', error.message);
    }
};

/**
 * Logs a user login event.
 * 
 * @param {Object} user - User document
 * @param {string} deviceId - Device ID
 */
const logLogin = (user, deviceId) => {
    return logUserAction(
        user._id,
        user.phone_number,
        USER_ACTIONS.LOGIN,
        deviceId,
        { name: user.name }
    );
};

/**
 * Logs a device change event.
 * 
 * @param {Object} user - User document
 * @param {string} previousDeviceId - Old device ID
 * @param {string} newDeviceId - New device ID
 */
const logDeviceChange = (user, previousDeviceId, newDeviceId) => {
    return logUserAction(
        user._id,
        user.phone_number,
        USER_ACTIONS.DEVICE_CHANGE,
        newDeviceId,
        { previousDeviceId, newDeviceId }
    );
};

/**
 * Logs a PDF read event.
 * 
 * @param {Object} user - User document (with userId and phone_number)
 * @param {string} deviceId - Device ID
 * @param {Object} pdfInfo - PDF information { pdfId, title }
 */
const logPdfRead = (user, deviceId, pdfInfo) => {
    return logUserAction(
        user.userId || user._id,
        user.phone_number,
        USER_ACTIONS.READ_PDF,
        deviceId,
        pdfInfo
    );
};

/**
 * Logs a name change attempt.
 * 
 * @param {Object} user - User document
 * @param {string} deviceId - Device ID
 * @param {string} previousName - Old name
 * @param {string} requestedName - Requested new name
 * @param {boolean} allowed - Whether the change was allowed
 */
const logNameChange = (user, deviceId, previousName, requestedName, allowed = true) => {
    return logUserAction(
        user._id,
        user.phone_number,
        USER_ACTIONS.NAME_CHANGE,
        deviceId,
        { previousName, requestedName, allowed }
    );
};

module.exports = {
    USER_ACTIONS,
    logUserAction,
    logLogin,
    logDeviceChange,
    logNameChange,
    logPdfRead
};
