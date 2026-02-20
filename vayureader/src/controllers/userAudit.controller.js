/**
 * User Audit Controller
 * 
 * Handles user audit log queries for admin dashboard.
 * 
 * @module controllers/userAudit.controller
 */

const UserAudit = require('../models/UserAudit');
const { escapeRegex } = require('../utils/sanitize');
const response = require('../utils/response');

/**
 * Get paginated user audit logs with optional filters.
 */
const getLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            phone_number,
            userId,
            deviceId,
            startDate,
            endDate
        } = req.query;

        // Build filter
        const filter = {};

        if (action) {
            filter.action = action;
        }

        if (phone_number) {
            const safePhone = escapeRegex(phone_number);
            filter.phone_number = { $regex: safePhone, $options: 'i' };
        }

        if (userId) {
            filter.userId = userId;
        }

        if (deviceId) {
            const safeDeviceId = escapeRegex(deviceId);
            filter.deviceId = { $regex: safeDeviceId, $options: 'i' };
        }

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = Math.min(parseInt(limit), 100); // Cap at 100

        const [logs, total] = await Promise.all([
            UserAudit.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            UserAudit.countDocuments(filter)
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
 * Get user audit statistics.
 */
const getStats = async (req, res, next) => {
    try {
        const [byAction, loginsByDay, topUsers, totalLogs] = await Promise.all([
            // Group by action type
            UserAudit.aggregate([
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            // Logins per day (last 30 days)
            UserAudit.aggregate([
                {
                    $match: {
                        action: 'LOGIN',
                        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Top users by activity
            UserAudit.aggregate([
                { $group: { _id: '$phone_number', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            UserAudit.countDocuments()
        ]);

        response.success(res, {
            byAction,
            loginsByDay,
            topUsers,
            totalLogs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get audit logs for a specific user.
 */
const getUserLogs = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = Math.min(parseInt(limit), 100);

        const [logs, total] = await Promise.all([
            UserAudit.find({ userId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            UserAudit.countDocuments({ userId })
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

module.exports = {
    getLogs,
    getStats,
    getUserLogs
};
