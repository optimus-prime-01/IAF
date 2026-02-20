/**
 * Abbreviation Controller
 * 
 * Handles abbreviation CRUD business logic.
 * 
 * @module controllers/abbreviation.controller
 */

const Abbreviation = require('../models/Abbreviation');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { escapeRegex, createExactMatchRegex } = require('../utils/sanitize');

const { redisClient } = require('../config/redis');
const { invalidateAbbreviation, invalidateAllAbbreviationCaches } = require('../services/cache.service');
const { searchAbbreviations: esSearchAbbreviations, indexAbbreviation, deleteAbbreviation: deleteAbbrFromES, bulkIndexAbbreviations } = require('../services/search.service');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    ABBREVIATION_LOOKUP: 86400,  // 24 hours
    ALL_ABBREVIATIONS: 3600,     // 1 hour (for full list)
    SEARCH_RESULTS: 1800         // 30 minutes for search results
};

/**
 * Search abbreviations using Elasticsearch with MongoDB fallback.
 * Cached for 30 minutes.
 */
const searchAbbreviations = async (req, res, next) => {
    try {
        const { search } = req.query;

        // Create cache key based on search term
        const cacheKey = search
            ? `abbr:search:${search.toUpperCase()}`
            : 'abbr:all';

        // Check Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        let abbreviations;

        // Only use ES for search queries, not "get all"
        if (search) {
            abbreviations = await esSearchAbbreviations(search, 100);
        }

        // Fallback to MongoDB if ES unavailable or no search term
        if (abbreviations === null || !search) {
            let query = {};
            if (search) {
                const safeSearch = escapeRegex(search);
                query = {
                    $or: [
                        { abbreviation: { $regex: safeSearch, $options: 'i' } },
                        { fullForm: { $regex: safeSearch, $options: 'i' } }
                    ]
                };
            }

            abbreviations = await Abbreviation.find(query)
                .sort({ abbreviation: 1 })
                .lean();
        }

        // Cache results
        await redisClient.set(cacheKey, JSON.stringify(abbreviations), {
            EX: search ? CACHE_TTL.SEARCH_RESULTS : CACHE_TTL.ALL_ABBREVIATIONS
        });

        response.success(res, abbreviations);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all abbreviations with pagination.
 * Query params: page (default 1), limit (default 100, max 500)
 */
const getAllAbbreviations = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
        const skip = (page - 1) * limit;

        const [abbreviations, total] = await Promise.all([
            Abbreviation.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Abbreviation.countDocuments({})
        ]);

        response.success(res, {
            abbreviations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Look up specific abbreviation.
 * Cached for 24 hours.
 */
const getAbbreviation = async (req, res, next) => {
    try {
        const abbr = req.params.abbr;

        if (!abbr) {
            return response.badRequest(res, 'Abbreviation parameter is required');
        }

        const cacheKey = `abbr:${abbr.toUpperCase()}`;

        // Check Redis cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        const result = await Abbreviation.findOne({
            abbreviation: createExactMatchRegex(abbr)
        }).lean();

        if (!result) {
            return response.notFound(res, 'Abbreviation not found');
        }

        // Cache for 24 hours
        await redisClient.set(cacheKey, JSON.stringify(result), {
            EX: CACHE_TTL.ABBREVIATION_LOOKUP
        });

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Create new abbreviation.
 */
const createAbbreviation = async (req, res, next) => {
    try {
        const { abbreviation, fullForm } = req.body;

        // Check for existing
        const existing = await Abbreviation.findOne({
            abbreviation: abbreviation.toUpperCase()
        });

        if (existing) {
            return response.conflict(res, 'Abbreviation already exists');
        }

        const newAbbr = new Abbreviation({
            abbreviation: abbreviation.toUpperCase(),
            fullForm
        });

        await newAbbr.save();

        await logCreate(RESOURCE_TYPES.ABBREVIATION, newAbbr._id, req.admin, {
            abbreviation: newAbbr.abbreviation,
            fullForm: newAbbr.fullForm
        });

        // Invalidate relevant caches and sync to ES
        await invalidateAbbreviation(newAbbr.abbreviation);
        indexAbbreviation(newAbbr).catch(err => console.error('[ES] Index abbreviation failed:', err.message));

        response.created(res, newAbbr, 'Abbreviation created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update abbreviation.
 */
const updateAbbreviation = async (req, res, next) => {
    try {
        const { abbreviation, fullForm } = req.body;

        const oldAbbr = await Abbreviation.findById(req.params.id);
        if (!oldAbbr) {
            return response.notFound(res, 'Abbreviation not found');
        }

        const updated = await Abbreviation.findByIdAndUpdate(
            req.params.id,
            {
                abbreviation: abbreviation.toUpperCase(),
                fullForm
            },
            { new: true, runValidators: true }
        );

        await logUpdate(RESOURCE_TYPES.ABBREVIATION, updated._id, req.admin, {
            old: { abbreviation: oldAbbr.abbreviation, fullForm: oldAbbr.fullForm },
            new: { abbreviation: updated.abbreviation, fullForm: updated.fullForm }
        });

        // Invalidate caches for both old and new abbreviation
        await invalidateAbbreviation(oldAbbr.abbreviation);
        if (oldAbbr.abbreviation !== updated.abbreviation) {
            await invalidateAbbreviation(updated.abbreviation);
        }

        // Sync to Elasticsearch
        indexAbbreviation(updated).catch(err => console.error('[ES] Index abbreviation failed:', err.message));

        response.success(res, updated, 'Abbreviation updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete abbreviation.
 */
const deleteAbbreviation = async (req, res, next) => {
    try {
        const abbr = await Abbreviation.findById(req.params.id);

        if (!abbr) {
            return response.notFound(res, 'Abbreviation not found');
        }

        await Abbreviation.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.ABBREVIATION, req.params.id, req.admin, {
            abbreviation: abbr.abbreviation
        });

        // Invalidate cache and remove from ES
        await invalidateAbbreviation(abbr.abbreviation);
        deleteAbbrFromES(req.params.id).catch(err => console.error('[ES] Delete abbreviation failed:', err.message));

        response.success(res, null, 'Abbreviation deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk upload abbreviations.
 */
const bulkUpload = async (req, res, next) => {
    try {
        const abbreviations = req.body;

        if (!Array.isArray(abbreviations)) {
            return response.badRequest(res, 'Input must be an array of abbreviations');
        }

        const formatted = abbreviations.map(item => ({
            abbreviation: item.abbreviation.toUpperCase(),
            fullForm: item.fullForm
        }));

        // Use insertMany with ordered: false to skip duplicates instead of failing
        const result = await Abbreviation.insertMany(formatted, { ordered: false });

        await logCreate(RESOURCE_TYPES.ABBREVIATION, null, req.admin, {
            count: result.length,
            message: 'Bulk upload abbreviations'
        });

        // Fire-and-forget ES sync so bulk upload is not blocked by indexing latency.
        void (async () => {
            try {
                if (result.length > 0) {
                    await bulkIndexAbbreviations(result);
                    console.log(`[ES] Indexed ${result.length} abbreviations`);
                }
            } catch (esError) {
                console.error('[ES] Bulk index abbreviations failed:', esError.message);
            }
        })();

        // Fire-and-forget cache invalidation so bulk upload is not blocked.
        void invalidateAllAbbreviationCaches().catch((cacheError) => {
            console.error('Cache invalidation error (all abbreviation):', cacheError.message);
        });

        response.created(res, { count: result.length }, `Successfully uploaded ${result.length} abbreviations`);
    } catch (error) {
        if (error.code === 11000) {
            // Handle duplicate keys gracefully
            const insertedCount = error.result?.insertedIds?.length || 0;

            await logCreate(RESOURCE_TYPES.ABBREVIATION, 'bulk-upload-partial', req.admin, {
                count: insertedCount,
                message: 'Bulk upload abbreviations (with duplicates)',
                duplicatesSkipped: abbreviations.length - insertedCount
            });

            // Still invalidate cache even for partial success (non-blocking)
            void invalidateAllAbbreviationCaches().catch((cacheError) => {
                console.error('Cache invalidation error (all abbreviation):', cacheError.message);
            });
            return response.success(res, { count: insertedCount }, `Uploaded ${insertedCount} abbreviations (duplicates skipped)`);
        }
        next(error);
    }
};

/**
 * Export all abbreviations.
 */
const exportAbbreviations = async (req, res, next) => {
    try {
        const abbreviations = await Abbreviation.find({})
            .sort({ abbreviation: 1 })
            .select('abbreviation fullForm -_id')
            .lean();

        response.success(res, abbreviations);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchAbbreviations,
    getAllAbbreviations,
    getAbbreviation,
    createAbbreviation,
    updateAbbreviation,
    deleteAbbreviation,
    bulkUpload,
    exportAbbreviations
};
