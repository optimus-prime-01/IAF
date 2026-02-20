/**
 * Search Service
 * 
 * Handles Elasticsearch operations for words and abbreviations.
 * 
 * @module services/search.service
 */

const { esClient, INDICES, isConnected } = require('../config/elasticsearch');

/**
 * Index a word document in Elasticsearch.
 * 
 * @param {Object} word - Word document from MongoDB
 */
const indexWord = async (word) => {
    try {
        if (!await isConnected()) {
            console.warn('[ES] Not connected, skipping word indexing');
            return false;
        }

        await esClient.index({
            index: INDICES.WORDS,
            id: word._id.toString(),
            body: {
                word: word.word,
                meanings: word.meanings,
                synonyms: word.synonyms || [],
                antonyms: word.antonyms || [],
                mongoId: word._id.toString()
            },
            refresh: true
        });

        return true;
    } catch (error) {
        console.error('[ES] Index word failed:', error.message);
        return false;
    }
};

/**
 * Index an abbreviation document in Elasticsearch.
 * 
 * @param {Object} abbr - Abbreviation document from MongoDB
 */
const indexAbbreviation = async (abbr) => {
    try {
        if (!await isConnected()) {
            console.warn('[ES] Not connected, skipping abbreviation indexing');
            return false;
        }

        await esClient.index({
            index: INDICES.ABBREVIATIONS,
            id: abbr._id.toString(),
            body: {
                abbreviation: abbr.abbreviation,
                fullForm: abbr.fullForm,
                mongoId: abbr._id.toString()
            },
            refresh: true
        });

        return true;
    } catch (error) {
        console.error('[ES] Index abbreviation failed:', error.message);
        return false;
    }
};

/**
 * Delete a word from Elasticsearch.
 * 
 * @param {string} id - MongoDB ObjectId as string
 */
const deleteWord = async (id) => {
    try {
        if (!await isConnected()) return false;

        await esClient.delete({
            index: INDICES.WORDS,
            id: id.toString(),
            refresh: true
        });

        return true;
    } catch (error) {
        if (error.meta?.statusCode !== 404) {
            console.error('[ES] Delete word failed:', error.message);
        }
        return false;
    }
};

/**
 * Delete an abbreviation from Elasticsearch.
 * 
 * @param {string} id - MongoDB ObjectId as string
 */
const deleteAbbreviation = async (id) => {
    try {
        if (!await isConnected()) return false;

        await esClient.delete({
            index: INDICES.ABBREVIATIONS,
            id: id.toString(),
            refresh: true
        });

        return true;
    } catch (error) {
        if (error.meta?.statusCode !== 404) {
            console.error('[ES] Delete abbreviation failed:', error.message);
        }
        return false;
    }
};

/**
 * Search words with fuzzy matching.
 * 
 * @param {string} query - Search query
 * @param {number} limit - Max results (default 50)
 * @returns {Array} Search results
 */
const searchWords = async (query, limit = 50) => {
    try {
        if (!await isConnected()) {
            console.warn('[ES] Not connected, falling back would need MongoDB');
            return null; // Return null to signal fallback needed
        }

        const result = await esClient.search({
            index: INDICES.WORDS,
            body: {
                size: limit,
                query: {
                    bool: {
                        should: [
                            // Exact match (highest score)
                            {
                                term: {
                                    'word.keyword': {
                                        value: query.toUpperCase(),
                                        boost: 10
                                    }
                                }
                            },
                            // Prefix match
                            {
                                prefix: {
                                    'word.keyword': {
                                        value: query.toUpperCase(),
                                        boost: 5
                                    }
                                }
                            },
                            // Fuzzy match (handles typos)
                            {
                                fuzzy: {
                                    word: {
                                        value: query.toLowerCase(),
                                        fuzziness: 'AUTO',
                                        boost: 2
                                    }
                                }
                            },
                            // Match in autocomplete analyzer
                            {
                                match: {
                                    word: {
                                        query: query,
                                        boost: 1
                                    }
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                }
            }
        });

        return result.hits.hits.map(hit => ({
            _id: hit._source.mongoId,
            word: hit._source.word,
            meanings: hit._source.meanings,
            synonyms: hit._source.synonyms,
            antonyms: hit._source.antonyms,
            score: hit._score
        }));
    } catch (error) {
        console.error('[ES] Search words failed:', error.message);
        return null; // Signal fallback
    }
};

/**
 * Search abbreviations with fuzzy matching.
 * 
 * @param {string} query - Search query
 * @param {number} limit - Max results (default 100)
 * @returns {Array} Search results
 */
const searchAbbreviations = async (query, limit = 100) => {
    try {
        if (!await isConnected()) {
            console.warn('[ES] Not connected, falling back would need MongoDB');
            return null;
        }

        const result = await esClient.search({
            index: INDICES.ABBREVIATIONS,
            body: {
                size: limit,
                query: {
                    bool: {
                        should: [
                            // Exact abbreviation match
                            {
                                term: {
                                    'abbreviation.keyword': {
                                        value: query.toUpperCase(),
                                        boost: 10
                                    }
                                }
                            },
                            // Fuzzy match on abbreviation
                            {
                                fuzzy: {
                                    abbreviation: {
                                        value: query.toLowerCase(),
                                        fuzziness: 'AUTO',
                                        boost: 5
                                    }
                                }
                            },
                            // Match in fullForm
                            {
                                match: {
                                    fullForm: {
                                        query: query,
                                        fuzziness: 'AUTO',
                                        boost: 2
                                    }
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                }
            }
        });

        return result.hits.hits.map(hit => ({
            _id: hit._source.mongoId,
            abbreviation: hit._source.abbreviation,
            fullForm: hit._source.fullForm,
            score: hit._score
        }));
    } catch (error) {
        console.error('[ES] Search abbreviations failed:', error.message);
        return null;
    }
};

/**
 * Bulk index words (for sync script).
 * 
 * @param {Array} words - Array of word documents
 */
const bulkIndexWords = async (words) => {
    try {
        if (!await isConnected() || words.length === 0) return false;

        const operations = words.flatMap(word => [
            { index: { _index: INDICES.WORDS, _id: word._id.toString() } },
            {
                word: word.word,
                meanings: word.meanings,
                synonyms: word.synonyms || [],
                antonyms: word.antonyms || [],
                mongoId: word._id.toString()
            }
        ]);

        const result = await esClient.bulk({ body: operations, refresh: true });

        if (result.errors) {
            console.error('[ES] Bulk index words had errors');
        }

        return !result.errors;
    } catch (error) {
        console.error('[ES] Bulk index words failed:', error.message);
        return false;
    }
};

/**
 * Bulk index abbreviations (for sync script).
 * 
 * @param {Array} abbreviations - Array of abbreviation documents
 */
const bulkIndexAbbreviations = async (abbreviations) => {
    try {
        if (!await isConnected() || abbreviations.length === 0) return false;

        const operations = abbreviations.flatMap(abbr => [
            { index: { _index: INDICES.ABBREVIATIONS, _id: abbr._id.toString() } },
            {
                abbreviation: abbr.abbreviation,
                fullForm: abbr.fullForm,
                mongoId: abbr._id.toString()
            }
        ]);

        const result = await esClient.bulk({ body: operations, refresh: true });

        if (result.errors) {
            console.error('[ES] Bulk index abbreviations had errors');
        }

        return !result.errors;
    } catch (error) {
        console.error('[ES] Bulk index abbreviations failed:', error.message);
        return false;
    }
};

module.exports = {
    indexWord,
    indexAbbreviation,
    deleteWord,
    deleteAbbreviation,
    searchWords,
    searchAbbreviations,
    bulkIndexWords,
    bulkIndexAbbreviations
};
