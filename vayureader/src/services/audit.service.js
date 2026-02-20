/**
 * Audit Service
 * 
 * Handles logging of administrative actions for accountability.
 * 
 * @module services/audit.service
 */

const AuditLog = require('../models/AuditLog');

/**
 * Resource types that can be audited.
 */
const RESOURCE_TYPES = {
    PDF: 'PDF',
    DICTIONARY: 'DICTIONARY_WORD',
    ABBREVIATION: 'ABBREVIATION',
    ADMIN: 'ADMIN'
};

/**
 * Action types that can be audited.
 */
const ACTION_TYPES = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    READ: 'READ'
};

/**
 * Log an action to the database.
 * 
 * @param {string} action - Action type
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} admin - Admin object (must contain _id, name, contact)
 * @param {Object} details - Additional details
 */
const logAction = async (action, resourceType, resourceId, admin, details = {}) => {
    try {
        if (!admin) {
            console.error('Audit Log Error: Admin object is required');
            return;
        }

        const logEntry = new AuditLog({
            action,
            resourceType,
            resourceId,
            adminId: admin._id || admin.id,
            adminName: admin.name || 'Unknown',
            adminContact: admin.contact || 'Unknown',
            details
        });

        await logEntry.save();
    } catch (error) {
        console.error('Audit Log Error:', error.message);
        // We log the error but don't rethrow to avoid breaking the main flow
    }
};

/**
 * Convenience functions for specific actions.
 */
const logCreate = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.CREATE, resourceType, resourceId, admin, details);
};

const logUpdate = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.UPDATE, resourceType, resourceId, admin, details);
};

const logDelete = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.DELETE, resourceType, resourceId, admin, details);
};

const logRead = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.READ, resourceType, resourceId, admin, details);
};

module.exports = {
    RESOURCE_TYPES,
    ACTION_TYPES,
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logRead
};
