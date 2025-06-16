const Dictionary = require('../models/DictionaryWord');

const addDictionaryWord = async (req, res) => {
try {
const { word, meanings, synonyms, antonyms } = req.body;

if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
  return res.status(400).json({ msg: 'Word and at least one definition are required' });
}

const existing = await Dictionary.findOne({ word });
if (existing) {
  return res.status(409).json({ msg: 'Word already exists' });
}


const formattedMeanings = meanings.map(m => ({
  partOfSpeech: m.partOfSpeech || null,
  definition: m.definition,
  synonyms: Array.isArray(m.synonyms) && m.synonyms.length ? m.synonyms : null,
  examples: Array.isArray(m.examples) && m.examples.length ? m.examples : null
}));

const newWord = new Dictionary({
  word,
  meanings: formattedMeanings,
  synonyms: Array.isArray(synonyms) && synonyms.length ? synonyms : null,
  antonyms: Array.isArray(antonyms) && antonyms.length ? antonyms : null
});

await newWord.save();
res.status(201).json({ msg: '✅ Word added successfully' });
} catch (error) {
console.error('Error adding dictionary word:', error);
res.status(500).json({ msg: 'Server error' });
}
};

module.exports = { addDictionaryWord };
