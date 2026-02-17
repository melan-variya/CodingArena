const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const competitionRoutes = require('./routes/competition.routes');
const submissionRoutes = require('./routes/submission.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const broadcastRoutes = require('./routes/broadcast.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', broadcastRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;
