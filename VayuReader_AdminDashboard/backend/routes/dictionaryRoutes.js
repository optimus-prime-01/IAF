const express = require('express');
const router = express.Router();
const DictionaryWord = require('../models/DictionaryWord');

router.post('/dictionary', async (req, res) => {
  try {
    const { word, meaning } = req.body;

    if (!word || !meaning) {
      return res.status(400).json({ msg: 'Both fields are required.' });
    }

    const newEntry = new DictionaryWord({ word, meaning });
    await newEntry.save();

    res.status(200).json({ msg: 'Dictionary word saved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error.' });
  }
});

module.exports = router;
