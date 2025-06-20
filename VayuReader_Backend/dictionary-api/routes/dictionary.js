const express = require('express');
const router = express.Router();
const Word = require('../models/Word');

// Health check for POST /api/dictionary/upload
router.get('/health/upload', (req, res) => {
  res.json({ status: 'ok', route: 'POST /api/dictionary/upload' });
});

// Health check for GET /api/dictionary/word/:word
router.get('/health/word/:word', (req, res) => {
  res.json({ status: 'ok', route: `GET /api/dictionary/word/${req.params.word}` });
});

// Health check for GET /api/dictionary/words
router.get('/health/words', (req, res) => {
  res.json({ status: 'ok', route: 'GET /api/dictionary/words' });
});

// General health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: '/api/dictionary' });
});

// Upload full dictionary
router.post('/upload', async (req, res) => {
  try {
    const dictionaryData = req.body;
    if (!dictionaryData || typeof dictionaryData !== 'object') {
      return res.status(400).json({ error: 'Invalid dictionary data format' });
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

        const wordDoc = {
          word: wordKey.toUpperCase(),
          meanings: meanings,
          antonyms: wordData.ANTONYMS || [],
          synonyms: wordData.SYNONYMS || []
        };

        words.push(wordDoc);
        processedCount++;
      } catch (error) {
        console.log(`Skipping word ${wordKey} due to format error:`, error.message);
        skippedCount++;
      }
    }

    if (words.length > 0) {
      const result = await Word.insertMany(words, { ordered: false });
      res.json({
        message: 'Dictionary uploaded successfully',
        totalWords: Object.keys(dictionaryData).length,
        processedWords: processedCount,
        insertedWords: result.length,
        skippedWords: skippedCount,
        duplicatesSkipped: processedCount - result.length
      });
    } else {
      res.status(400).json({ error: 'No valid words found in the dictionary data' });
    }
  } catch (error) {
    console.error('Error uploading dictionary:', error);
    if (error.code === 11000) {
      const insertedCount = error.result?.result?.insertedIds ? Object.keys(error.result.result.insertedIds).length : 0;
      res.json({
        message: 'Dictionary uploaded with some duplicates',
        insertedWords: insertedCount,
        duplicatesSkipped: error.result?.writeErrors?.length || 0
      });
    } else {
      res.status(500).json({ error: 'Failed to upload dictionary', details: error.message });
    }
  }
});

// Exact match + related words
router.get('/word/:word', async (req, res) => {
  try {
    const word = req.params.word;
    if (!word) {
      return res.status(400).json({ error: 'Word parameter is required' });
    }

    const wordDoc = await Word.findOne({ word: { $regex: `^${word}$`, $options: 'i' } }).lean();
    const relatedWords = await Word.find({ word: { $regex: word, $options: 'i' } })
      .limit(20)
      .select('word')
      .lean();

    if (!wordDoc) {
      return res.status(404).json({
        error: 'Word not found',
        word: word,
        related: relatedWords.map(w => w.word)
      });
    }

    res.json({
      word: wordDoc.word,
      meanings: wordDoc.meanings,
      synonyms: wordDoc.synonyms,
      antonyms: wordDoc.antonyms,
      related: relatedWords
        .map(w => w.word)
        .filter(w => w.toLowerCase() !== word.toLowerCase())
    });
  } catch (error) {
    console.error('Error retrieving word:', error);
    res.status(500).json({ error: 'Failed to retrieve word meaning' });
  }
});

// Get first 100 words
router.get('/words', async (req, res) => {
  try {
    const words = await Word.find().limit(100).select('word').lean();
    res.json({
      total: words.length,
      words: words.map(w => w.word)
    });
  } catch (error) {
    console.error('Error retrieving words:', error);
    res.status(500).json({ error: 'Failed to retrieve words' });
  }
});

// Partial search for words with full info (meanings, etc.)
router.get('/search/:term', async (req, res) => {
  try {
    const searchTerm = req.params.term;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const regex = new RegExp(searchTerm, 'i');
    const results = await Word.find({ word: regex })
      .limit(20)
      .lean();

    res.json({
      total: results.length,
      words: results
    });
  } catch (error) {
    console.error('Error searching words:', error);
    res.status(500).json({ error: 'Failed to search words' });
  }
});
module.exports = router;
