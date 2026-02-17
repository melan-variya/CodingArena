const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect } = require('../middleware/auth.middleware');

// Leaderboard APIs
router.get('/:id', protect, leaderboardController.getLeaderboard);
router.post('/update', protect, leaderboardController.updateLeaderboard);

module.exports = router;
