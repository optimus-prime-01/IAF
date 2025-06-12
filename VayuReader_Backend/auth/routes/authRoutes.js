const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const { signupSchema, loginSchema } = require('../schemas/authSchemas');
const validate = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/profile', auth, getProfile);

module.exports = router;