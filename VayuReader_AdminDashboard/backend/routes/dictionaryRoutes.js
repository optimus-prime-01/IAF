const express = require('express');
const router = express.Router();
const { addDictionaryWord } = require('../controllers/dictionaryController');

router.post('/', addDictionaryWord);

module.exports = router;
