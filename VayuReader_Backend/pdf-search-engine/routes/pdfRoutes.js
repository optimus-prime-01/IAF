const express = require('express');
const AcronymModel = require('../models/pdfDocument');
const router = express.Router();
const acronymModel = new AcronymModel();

router.get('/acronyms', (req, res) => {
  res.json(acronymModel.getAll());
});

router.get('/find/:acronym', (req, res) => {
  const result = acronymModel.find(req.params.acronym);
  if (!result) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result);
});

router.post('/acronyms', (req, res) => {
  const { acronym, fullForm } = req.body;
  if (!acronym || !fullForm) {
    return res.status(400).json({ error: 'Both acronym and fullForm are required' });
  }
  if (acronymModel.find(acronym)) {
    return res.status(409).json({ error: 'Acronym already exists' });
  }
  res.status(201).json(acronymModel.add(acronym, fullForm));
});

module.exports = router;