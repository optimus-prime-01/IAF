/**
 * Dictionary Controller
 * 
 * Handles dictionary word CRUD business logic.
 * 
 * @module controllers/dictionary.controller
 */

const Word = require('../models/Word');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { escapeRegex, createExactMatchRegex } = require('../utils/sanitize');

const { redisClient } = require('../config/redis');
const { invalidateWord, invalidateAllDictionaryCaches } = require('../services/cache.service');
const { searchWords: esSearchWords, indexWord, deleteWord: deleteWordFromES, bulkIndexWords } = require('../services/search.service');

/**
 * Look up a word and get related words.
 * Cached in Redis for 24 hours.
 */
const lookupWord = async (req, res, next) => {
    try {
        const word = req.params.word;

        if (!word) {
            return response.badRequest(res, 'Word parameter is required');
        }

        const cacheKey = `word:${word.toUpperCase()}`;

        // Check Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        const safeWord = escapeRegex(word);

        const [wordDoc, relatedWords] = await Promise.all([
            Word.findOne({ word: createExactMatchRegex(word) }).lean(),
            Word.find({ word: { $regex: safeWord, $options: 'i' } })
                .limit(20)
                .select('word')
                .lean()
        ]);

        if (!wordDoc) {
            return response.notFound(res, 'Word not found', {
                word,
                related: relatedWords.map(w => w.word)
            });
        }

        const result = {
            word: wordDoc.word,
            meanings: wordDoc.meanings,
            synonyms: wordDoc.synonyms,
            antonyms: wordDoc.antonyms,
            related: relatedWords
                .map(w => w.word)
                .filter(w => w.toLowerCase() !== word.toLowerCase())
        };

        // Cache for 24 hours
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 86400 });

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get first 100 words.
 * Cached in Redis for 1 hour.
 */
const getWords = async (req, res, next) => {
    try {
        const cacheKey = 'words:preview:100';

        // Check Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        const words = await Word.find()
            .limit(100)
            .select('word')
            .lean();

        const result = {
            total: words.length,
            words: words.map(w => w.word)
        };

        // Cache for 1 hour
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 });

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all words with pagination.
 * Query params: page (default 1), limit (default 100, max 1000)
 */
const getAllWords = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 100));
        const skip = (page - 1) * limit;

        const [words, total] = await Promise.all([
            Word.find({})
                .sort({ word: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Word.countDocuments({})
        ]);

        response.success(res, {
            words,
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
 * Search words using Elasticsearch with MongoDB fallback.
 * Cached in Redis for 30 minutes.
 */
const searchWords = async (req, res, next) => {
    try {
        // Support both path parameter and query parameter
        const searchTerm = req.params.term || req.query.search || req.query.term;

        if (!searchTerm) {
            return response.badRequest(res, 'Search term is required');
        }

        const cacheKey = `word:search:${searchTerm.toUpperCase()}`;

        // Check Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        // Try Elasticsearch first
        let results = await esSearchWords(searchTerm, 50);

        // Fallback to MongoDB if ES unavailable
        if (results === null) {
            const safeSearch = escapeRegex(searchTerm);
            results = await Word.find({
                word: { $regex: safeSearch, $options: 'i' }
            })
                .limit(50)
                .select('word meanings synonyms antonyms')
                .lean();
        }

        // Cache search results for 30 minutes
        await redisClient.set(cacheKey, JSON.stringify(results), { EX: 1800 });

        response.success(res, results);
    } catch (error) {
        next(error);
    }
};

/**
 * Add a new word.
 */
const createWord = async (req, res, next) => {
    try {
        const { word, meanings, synonyms, antonyms } = req.body;

        if (!Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
            return response.badRequest(res, 'At least one meaning with definition is required');
        }

        // Check for existing word
        const existing = await Word.findOne({ word: word.toUpperCase() });
        if (existing) {
            return response.conflict(res, 'Word already exists');
        }

        const formattedMeanings = meanings.map(m => ({
            partOfSpeech: m.partOfSpeech || null,
            definition: m.definition,
            synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
            examples: Array.isArray(m.examples) ? m.examples : []
        }));

        const newWord = new Word({
            word: word.toUpperCase(),
            meanings: formattedMeanings,
            synonyms: Array.isArray(synonyms) ? synonyms : [],
            antonyms: Array.isArray(antonyms) ? antonyms : []
        });

        await newWord.save();

        await logCreate(RESOURCE_TYPES.DICTIONARY, newWord._id, req.admin, {
            word: newWord.word
        });

        // Invalidate cache and sync to Elasticsearch
        await invalidateWord(newWord.word);
        indexWord(newWord).catch(err => console.error('[ES] Index word failed:', err.message));

        response.created(res, newWord, 'Word added successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update a word.
 */
const updateWord = async (req, res, next) => {
    try {
        const { word, meanings, synonyms, antonyms } = req.body;

        if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0) {
            return response.badRequest(res, 'Word and at least one meaning required');
        }

        const oldWord = await Word.findById(req.params.id);
        if (!oldWord) {
            return response.notFound(res, 'Word not found');
        }

        const formattedMeanings = meanings.map(m => ({
            partOfSpeech: m.partOfSpeech || null,
            definition: m.definition,
            synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
            examples: Array.isArray(m.examples) ? m.examples : []
        }));

        const updateData = {
            word: word.toUpperCase(),
            meanings: formattedMeanings,
            synonyms: Array.isArray(synonyms) ? synonyms : [],
            antonyms: Array.isArray(antonyms) ? antonyms : []
        };

        const updated = await Word.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        await logUpdate(RESOURCE_TYPES.DICTIONARY, updated._id, req.admin, {
            old: { word: oldWord.word },
            new: { word: updated.word }
        });

        // Invalidate cache for both old and new word
        await invalidateWord(oldWord.word);
        if (oldWord.word !== updated.word) {
            await invalidateWord(updated.word);
        }

        // Sync to Elasticsearch
        indexWord(updated).catch(err => console.error('[ES] Index word failed:', err.message));

        response.success(res, updated, 'Word updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a word.
 */
const deleteWord = async (req, res, next) => {
    try {
        const word = await Word.findById(req.params.id);

        if (!word) {
            return response.notFound(res, 'Word not found');
        }

        await Word.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.DICTIONARY, req.params.id, req.admin, {
            word: word.word
        });

        // Invalidate cache and remove from Elasticsearch
        await invalidateWord(word.word);
        deleteWordFromES(req.params.id).catch(err => console.error('[ES] Delete word failed:', err.message));

        response.success(res, null, 'Word deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk upload dictionary with batching.
 * Inserts in batches of 500 to avoid memory issues.
 */
const uploadDictionary = async (req, res, next) => {
    try {
        const dictionaryData = req.body;

        if (!dictionaryData || typeof dictionaryData !== 'object') {
            return response.badRequest(res, 'Invalid dictionary data format');
        }

        const words = [];
        let processedCount = 0;
        let skippedCount = 0;

        for (const [wordKey, wordData] of Object.entries(dictionaryData)) {
            try {
                const meanings = wordData.MEANINGS?.map(meaning => ({
                    partOfSpeech: meaning[0] || '',
                    definition: meaning[1] || '',
                    synonyms: meaning[2] || [],
                    examples: meaning[3] || []
                })) || [];

                if (meanings.length === 0) {
                    skippedCount++;
                    continue;
                }

                words.push({
                    word: wordKey.toUpperCase(),
                    meanings,
                    antonyms: wordData.ANTONYMS || [],
                    synonyms: wordData.SYNONYMS || []
                });
                processedCount++;
            } catch (error) {
                skippedCount++;
            }
        }

        if (words.length === 0) {
            return response.badRequest(res, 'No valid words found');
        }

        // Batch insert in chunks of 500
        const BATCH_SIZE = 500;
        let insertedCount = 0;
        let duplicatesCount = 0;

        for (let i = 0; i < words.length; i += BATCH_SIZE) {
            const batch = words.slice(i, i + BATCH_SIZE);
            try {
                const result = await Word.insertMany(batch, { ordered: false });
                insertedCount += result.length;
            } catch (error) {
                if (error.code === 11000) {
                    insertedCount += error.result?.insertedIds?.length || 0;
                    duplicatesCount += error.writeErrors?.length || 0;
                } else {
                    throw error;
                }
            }
        }

        // Fire-and-forget ES sync so large uploads are not blocked by indexing latency.
        void (async () => {
            try {
                const insertedWords = await Word.find({ word: { $in: words.map(w => w.word) } }).lean();
                if (insertedWords.length > 0) {
                    await bulkIndexWords(insertedWords);
                    console.log(`[ES] Indexed ${insertedWords.length} words`);
                }
            } catch (esError) {
                console.error('[ES] Bulk index after upload failed:', esError.message);
            }
        })();

        // Fire-and-forget cache invalidation so bulk upload is not blocked.
        void invalidateAllDictionaryCaches().catch((cacheError) => {
            console.error('Cache invalidation error (all dictionary):', cacheError.message);
        });

        await logCreate(RESOURCE_TYPES.DICTIONARY, 'bulk-upload', req.admin, {
            count: insertedCount,
            totalProcessed: processedCount,
            duplicatesSkipped: duplicatesCount,
            message: 'Bulk upload dictionary words'
        });

        response.success(res, {
            totalWords: Object.keys(dictionaryData).length,
            processedWords: processedCount,
            insertedWords: insertedCount,
            duplicatesSkipped: duplicatesCount,
            skippedWords: skippedCount
        }, 'Dictionary uploaded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Export all words in the dictionary.
 */
const exportDictionary = async (req, res, next) => {
    try {
        const words = await Word.find({})
            .sort({ word: 1 })
            .lean();

        // Format into { "WORD": { MEANINGS: [...], SYNONYMS: [...], ANTONYMS: [...] } }
        // to match the bulk upload format
        const exportData = {};

        words.forEach(w => {
            exportData[w.word] = {
                MEANINGS: w.meanings.map(m => [
                    m.partOfSpeech || '',
                    m.definition,
                    m.synonyms || [],
                    m.examples || []
                ]),
                SYNONYMS: w.synonyms || [],
                ANTONYMS: w.antonyms || []
            };
        });

        response.success(res, exportData);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    lookupWord,
    getWords,
    getAllWords,
    searchWords,
    createWord,
    updateWord,
    deleteWord,
    uploadDictionary,
    exportDictionary
};
