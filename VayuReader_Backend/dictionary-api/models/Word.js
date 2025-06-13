const mongoose = require('mongoose');

const meaningSchema = new mongoose.Schema({
  partOfSpeech: String,
  definition: String,
  synonyms: [String],
  examples: [String]
});

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true, index: true },
  meanings: [meaningSchema],
  synonyms: [String],
  antonyms: [String]
});

// Ensure index for fast search
wordSchema.index({ word: 1 });

module.exports = mongoose.model('Word', wordSchema);