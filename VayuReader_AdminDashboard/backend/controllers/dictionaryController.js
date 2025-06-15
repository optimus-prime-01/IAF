const Dictionary = require('../models/DictionaryWord');

const addDictionaryWord = async (req, res) => {
  try {
    const { word, meaning } = req.body;

    if (!word || !meaning) {
      return res.status(400).json({ msg: 'Both word and meaning are required' });
    }

    const existing = await Dictionary.findOne({ word });
    if (existing) {
      return res.status(409).json({ msg: 'Word already exists' });
    }

    const newWord = new Dictionary({ word, meaning });
    await newWord.save();

    res.status(201).json({ msg: '✅ Word added successfully' });
  } catch (error) {
    console.error('Error adding dictionary word:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { addDictionaryWord };
