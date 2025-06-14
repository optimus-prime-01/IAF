const mongoose = require("mongoose");

const pdfDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true }
);

pdfDocumentSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("PdfDocument", pdfDocumentSchema);
