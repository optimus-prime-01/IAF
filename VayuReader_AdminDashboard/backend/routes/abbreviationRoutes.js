const express = require('express');
const router = express.Router();
const { addAbbreviation } = require('../controllers/abbreviationController');

router.post('/add', addAbbreviation);

module.exports = router;
