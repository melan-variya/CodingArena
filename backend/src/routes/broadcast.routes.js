const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcast.controller');

// Broadcast overlay APIs (public access for OBS)
router.get('/overlay/:id', broadcastController.getOverlayData);
router.get('/broadcast/state/:id', broadcastController.getBroadcastState);

module.exports = router;
