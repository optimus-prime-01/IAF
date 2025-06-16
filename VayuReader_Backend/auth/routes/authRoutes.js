const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const { signupSchema, loginSchema } = require('../schemas/authSchemas');
const validate = require('../middleware/validation');
const auth = require('../middleware/auth');

// Health check for signup
router.get('/health/signup', (req, res) => {
  res.json({ status: 'ok', route: 'POST /api/auth/signup' });
});

// Health check for login
router.get('/health/login', (req, res) => {
  res.json({ status: 'ok', route: 'POST /api/auth/login' });
});

// Health check for profile
router.get('/health/profile', (req, res) => {
  res.json({ status: 'ok', route: 'GET /api/auth/profile' });
});

// General health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: '/api/auth' });
});

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/profile', auth, getProfile);

module.exports = router;
