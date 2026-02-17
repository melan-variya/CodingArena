const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competition.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Competition Management APIs
router.post('/create', protect, authorize('organizer'), competitionController.createCompetition);
router.get('/:id', protect, competitionController.getCompetition);
router.post('/:id/start', protect, authorize('organizer'), competitionController.startCompetition);
router.post('/:id/end', protect, authorize('organizer'), competitionController.endCompetition);

// Participant APIs
router.post('/:id/join', protect, competitionController.joinCompetition);
router.get('/:id/players', protect, competitionController.getPlayers);
router.post('/:id/focus', protect, authorize('organizer'), competitionController.setFocusedPlayer);

module.exports = router;

