const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { protect } = require('../middleware/auth.middleware');

// Code update API
router.post('/code/update', protect, submissionController.updateCode);

// Submission APIs
router.post('/submission/run', protect, submissionController.runSubmission);
router.post('/submission/submit', protect, submissionController.submitSolution);

module.exports = router;
