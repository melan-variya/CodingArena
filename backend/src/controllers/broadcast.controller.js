const Competition = require('../models/Competition');
const Submission = require('../models/Submission');

// GET /api/overlay/:id - Data for OBS screen overlay
const getOverlayData = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('organizer', 'username')
      .populate('participants.user', 'username')
      .populate('focusedPlayer', 'username email')
      .populate('leaderboard.user', 'username');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Sort leaderboard by score
    const sortedLeaderboard = competition.leaderboard
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.lastUpdate) - new Date(b.lastUpdate);
      })
      .slice(0, 10) // Top 10 for overlay
      .map((entry, index) => ({
        rank: index + 1,
        username: entry.user.username,
        score: entry.score,
        problemsSolved: entry.solvedProblems.length
      }));

    // Calculate time remaining
    let timeRemaining = null;
    if (competition.status === 'active' && competition.endTime) {
      const now = new Date();
      const end = new Date(competition.endTime);
      timeRemaining = Math.max(0, Math.floor((end - now) / 1000)); // in seconds
    }

    // Get focused player info if set
    let focusedPlayerData = null;
    if (competition.focusedPlayer) {
      const recentSubmissions = await Submission.find({
        competition: competition._id,
        user: competition.focusedPlayer._id
      })
        .sort({ submittedAt: -1 })
        .limit(5)
        .select('problemIndex status submittedAt');

      focusedPlayerData = {
        username: competition.focusedPlayer.username,
        recentActivity: recentSubmissions
      };
    }

    res.status(200).json({
      success: true,
      data: {
        competitionTitle: competition.title,
        status: competition.status,
        timeRemaining,
        participantCount: competition.participants.length,
        leaderboard: sortedLeaderboard,
        focusedPlayer: focusedPlayerData
      }
    });
  } catch (error) {
    console.error('Get overlay data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overlay data'
    });
  }
};

// GET /api/broadcast/state/:id - Current broadcast state
const getBroadcastState = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('focusedPlayer', 'username email')
      .populate('leaderboard.user', 'username');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Calculate time data
    let timeData = {
      status: competition.status,
      startTime: competition.startTime,
      endTime: competition.endTime,
      duration: competition.duration
    };

    if (competition.status === 'active' && competition.endTime) {
      const now = new Date();
      const end = new Date(competition.endTime);
      const start = new Date(competition.startTime);
      
      timeData.timeRemaining = Math.max(0, Math.floor((end - now) / 1000)); // seconds
      timeData.timeElapsed = Math.floor((now - start) / 1000); // seconds
      timeData.progress = Math.min(100, Math.floor((timeData.timeElapsed / (competition.duration * 60)) * 100));
    }

    // Get top 3 for quick display
    const topThree = competition.leaderboard
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.lastUpdate) - new Date(b.lastUpdate);
      })
      .slice(0, 3)
      .map((entry, index) => ({
        rank: index + 1,
        username: entry.user.username,
        score: entry.score
      }));

    // Focused player data
    let focusedPlayer = null;
    if (competition.focusedPlayer) {
      const focusedEntry = competition.leaderboard.find(
        entry => entry.user._id.toString() === competition.focusedPlayer._id.toString()
      );

      focusedPlayer = {
        id: competition.focusedPlayer._id,
        username: competition.focusedPlayer.username,
        score: focusedEntry ? focusedEntry.score : 0,
        problemsSolved: focusedEntry ? focusedEntry.solvedProblems.length : 0
      };
    }

    res.status(200).json({
      success: true,
      data: {
        competitionId: competition._id,
        title: competition.title,
        timer: timeData,
        topThree,
        focusedPlayer,
        totalParticipants: competition.participants.length
      }
    });
  } catch (error) {
    console.error('Get broadcast state error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching broadcast state'
    });
  }
};

module.exports = {
  getOverlayData,
  getBroadcastState
};
