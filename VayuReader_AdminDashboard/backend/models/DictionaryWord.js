const mongoose = require('mongoose');

const DictionaryWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: { type: String, required: true },
});

module.exports = mongoose.model('DictionaryWord', DictionaryWordSchema);
