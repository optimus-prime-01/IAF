const mongoose = require('mongoose');

const MeaningSchema = new mongoose.Schema({
partOfSpeech: { type: String, default: null },
definition: { type: String, required: true },
synonyms: { type: [String], default: null },
examples: { type: [String], default: null },
});

const DictionaryWordSchema = new mongoose.Schema({
word: { type: String, required: true, unique: true },
meanings: { type: [MeaningSchema], required: true },
synonyms: { type: [String], default: null },
antonyms: { type: [String], default: null },
});

module.exports = mongoose.model('DictionaryWord', DictionaryWordSchema);
