/**
 * Audit Controller
 * 
 * Handles audit log queries.
 * 
 * @module controllers/audit.controller
 */

const AuditLog = require('../models/AuditLog');
const { escapeRegex } = require('../utils/sanitize');
const response = require('../utils/response');

/**
 * Get paginated audit logs with optional filters.
 */
const getLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            resourceType,
            adminName,
            startDate,
            endDate
        } = req.query;

        // Build filter
        const filter = {};

        if (action) {
            filter.action = action;
        }

        if (resourceType) {
            filter.resourceType = resourceType;
        }

        if (adminName) {
            const safeName = escapeRegex(adminName);
            filter.adminName = { $regex: safeName, $options: 'i' };
        }

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = Math.min(parseInt(limit), 100); // Cap at 100

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            AuditLog.countDocuments(filter)
        ]);

        response.success(res, {
            logs,
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
 * Get audit statistics.
 */
const getStats = async (req, res, next) => {
    try {
        const [byResourceType, topAdmins, totalLogs] = await Promise.all([
            AuditLog.aggregate([
                {
                    $group: {
                        _id: { action: '$action', resourceType: '$resourceType' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.resourceType',
                        actions: {
                            $push: { action: '$_id.action', count: '$count' }
                        },
                        total: { $sum: '$count' }
                    }
                }
            ]),
            AuditLog.aggregate([
                { $group: { _id: '$adminName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            AuditLog.countDocuments()
        ]);

        response.success(res, {
            byResourceType,
            topAdmins,
            totalLogs
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLogs,
    getStats
};
