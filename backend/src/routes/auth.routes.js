const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/me - Get current logged-in user
router.get('/me', protect, authController.getMe);

module.exports = router;
