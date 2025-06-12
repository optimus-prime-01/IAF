const express = require('express');
const PdfDocument = require('../models/pdfDocument');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const documents = await PdfDocument.find(query);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const { title, content, serverUrl, pdfUrl } = req.body;
    
    const newDocument = new PdfDocument({
      title,
      content,
      serverUrl,
      pdfUrl
    });
    
    const savedDocument = await newDocument.save();
    res.status(201).json(savedDocument);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;