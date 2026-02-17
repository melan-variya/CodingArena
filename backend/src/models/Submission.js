const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  competition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competition',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problemIndex: {
    type: Number,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'python', 'java', 'cpp', 'csharp']
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'accepted', 'wrong_answer', 'error', 'time_limit'],
    default: 'pending'
  },
  output: {
    type: String
  },
  executionTime: {
    type: Number // in milliseconds
  },
  memoryUsed: {
    type: Number // in KB
  },
  testCasesPassed: {
    type: Number,
    default: 0
  },
  totalTestCases: {
    type: Number,
    default: 0
  },
  isSubmission: {
    type: Boolean,
    default: false // false for run, true for final submission
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', submissionSchema);

