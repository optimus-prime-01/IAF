const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema({
title: {
type: String,
required: true,
},
content: {
type: String,
required: true,
},
category: {
type: String,
required: true,
},
pdf: {
type: String,
required: true,
},
thumbnail: {
type: String, 
},
uploadedAt: {
type: Date,
default: Date.now,
},
});

module.exports = mongoose.model("Pdf", pdfSchema);

