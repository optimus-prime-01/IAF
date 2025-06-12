const mongoose = require('mongoose');

const pdfDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  serverUrl: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });


pdfDocumentSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('PdfDocument', pdfDocumentSchema);