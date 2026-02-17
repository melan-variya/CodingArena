const Competition = require('../models/Competition');

// GET /api/leaderboard/:id - Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('leaderboard.user', 'username email')
      .select('leaderboard title status');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Sort leaderboard by score (descending)
    const sortedLeaderboard = competition.leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If scores are equal, sort by last update time (earlier is better)
      return new Date(a.lastUpdate) - new Date(b.lastUpdate);
    });

    // Add rank to each entry
    const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      score: entry.score,
      solvedProblems: entry.solvedProblems.length,
      lastUpdate: entry.lastUpdate
    }));

    res.status(200).json({
      success: true,
      data: {
        competitionId: competition._id,
        competitionTitle: competition.title,
        status: competition.status,
        leaderboard: rankedLeaderboard
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard'
    });
  }
};

// POST /api/leaderboard/update - Update leaderboard scores
const updateLeaderboard = async (req, res) => {
  try {
    const { competitionId, userId, problemIndex, points } = req.body;

    if (!competitionId || !userId || problemIndex === undefined || !points) {
      return res.status(400).json({
        success: false,
        message: 'Competition ID, user ID, problem index, and points are required'
      });
    }

    const competition = await Competition.findById(competitionId);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Find user's leaderboard entry
    const leaderboardEntry = competition.leaderboard.find(
      entry => entry.user.toString() === userId
    );

    if (!leaderboardEntry) {
      return res.status(404).json({
        success: false,
        message: 'User not found in competition'
      });
    }

    // Check if problem already solved
    const alreadySolved = leaderboardEntry.solvedProblems.some(
      sp => sp.problemIndex === problemIndex
    );

    if (alreadySolved) {
      return res.status(400).json({
        success: false,
        message: 'Problem already solved by this user'
      });
    }

    // Update score
    leaderboardEntry.score += points;
    leaderboardEntry.solvedProblems.push({
      problemIndex,
      solvedAt: new Date(),
      points
    });
    leaderboardEntry.lastUpdate = new Date();

    await competition.save();

    res.status(200).json({
      success: true,
      message: 'Leaderboard updated successfully',
      data: {
        userId,
        newScore: leaderboardEntry.score,
        solvedProblems: leaderboardEntry.solvedProblems.length
      }
    });
  } catch (error) {
    console.error('Update leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating leaderboard'
    });
  }
};

module.exports = {
  getLeaderboard,
  updateLeaderboard
};
