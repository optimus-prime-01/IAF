const mongoose = require('mongoose');

const abbreviationSchema = new mongoose.Schema({
  abbreviation: { type: String, required: true },
  meaning: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Abbreviation', abbreviationSchema);
