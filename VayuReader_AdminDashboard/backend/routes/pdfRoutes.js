const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadPdfMetadata } = require('../controllers/pdfController');

// Accept both pdf and thumbnail (optional)
router.post('/upload', upload.fields([
{ name: 'pdf', maxCount: 1 },
{ name: 'thumbnail', maxCount: 1 }
]), uploadPdfMetadata);

module.exports = router;