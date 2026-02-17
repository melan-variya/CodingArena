const Competition = require('../models/Competition');
const User = require('../models/User');

// POST /api/competition/create - Create new competition
const createCompetition = async (req, res) => {
  try {
    const { title, description, problems, duration } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Competition title is required'
      });
    }

    const competition = await Competition.create({
      title,
      description,
      problems: problems || [],
      duration: duration || 60,
      organizer: req.user.id,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Competition created successfully',
      data: { competition }
    });
  } catch (error) {
    console.error('Create competition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating competition'
    });
  }
};

// GET /api/competition/:id - Get competition details
const getCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('organizer', 'username email role')
      .populate('participants.user', 'username email role')
      .populate('focusedPlayer', 'username email')
      .populate('leaderboard.user', 'username email');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { competition }
    });
  } catch (error) {
    console.error('Get competition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching competition'
    });
  }
};

// POST /api/competition/:id/start - Start competition
const startCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Check if user is the organizer
    if (competition.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only organizer can start the competition'
      });
    }

    if (competition.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Competition is already active'
      });
    }

    competition.status = 'active';
    competition.startTime = new Date();
    competition.endTime = new Date(Date.now() + competition.duration * 60 * 1000);
    await competition.save();

    res.status(200).json({
      success: true,
      message: 'Competition started successfully',
      data: { competition }
    });
  } catch (error) {
    console.error('Start competition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting competition'
    });
  }
};

// POST /api/competition/:id/end - End competition
const endCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Check if user is the organizer
    if (competition.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only organizer can end the competition'
      });
    }

    if (competition.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Competition has already ended'
      });
    }

    competition.status = 'ended';
    competition.endTime = new Date();
    await competition.save();

    res.status(200).json({
      success: true,
      message: 'Competition ended successfully',
      data: { competition }
    });
  } catch (error) {
    console.error('End competition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while ending competition'
    });
  }
};

// POST /api/competition/:id/join - Join competition
const joinCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Check if already joined
    const alreadyJoined = competition.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this competition'
      });
    }

    competition.participants.push({
      user: req.user.id,
      joinedAt: new Date()
    });

    // Initialize leaderboard entry
    competition.leaderboard.push({
      user: req.user.id,
      score: 0,
      solvedProblems: []
    });

    await competition.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined competition',
      data: { competition }
    });
  } catch (error) {
    console.error('Join competition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while joining competition'
    });
  }
};

// GET /api/competition/:id/players - Get player list
const getPlayers = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('participants.user', 'username email role');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        players: competition.participants,
        count: competition.participants.length
      }
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching players'
    });
  }
};

// POST /api/competition/:id/focus - Set focused player
const setFocusedPlayer = async (req, res) => {
  try {
    const { playerId } = req.body;
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Check if user is the organizer
    if (competition.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only organizer can set focused player'
      });
    }

    competition.focusedPlayer = playerId;
    await competition.save();

    res.status(200).json({
      success: true,
      message: 'Focused player set successfully',
      data: { focusedPlayer: playerId }
    });
  } catch (error) {
    console.error('Set focused player error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting focused player'
    });
  }
};

module.exports = {
  createCompetition,
  getCompetition,
  startCompetition,
  endCompetition,
  joinCompetition,
  getPlayers,
  setFocusedPlayer
};

