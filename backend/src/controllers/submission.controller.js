const Submission = require('../models/Submission');
const Competition = require('../models/Competition');

// POST /api/code/update - Save code state
const updateCode = async (req, res) => {
  try {
    const { competitionId, problemIndex, code, language } = req.body;

    if (!competitionId || problemIndex === undefined || !code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Competition ID, problem index, code, and language are required'
      });
    }

    // Verify competition exists and is active
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    // Save code as a non-submission (backup)
    const codeState = await Submission.create({
      competition: competitionId,
      user: req.user.id,
      problemIndex,
      code,
      language,
      status: 'pending',
      isSubmission: false
    });

    res.status(200).json({
      success: true,
      message: 'Code saved successfully',
      data: { codeState }
    });
  } catch (error) {
    console.error('Update code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving code'
    });
  }
};

// POST /api/submission/run - Run solution
const runSubmission = async (req, res) => {
  try {
    const { competitionId, problemIndex, code, language } = req.body;

    if (!competitionId || problemIndex === undefined || !code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Competition ID, problem index, code, and language are required'
      });
    }

    // Create submission record with running status
    const submission = await Submission.create({
      competition: competitionId,
      user: req.user.id,
      problemIndex,
      code,
      language,
      status: 'running',
      isSubmission: false
    });

    // Simulate code execution (in real app, integrate with code execution service)
    // For now, return mock results
    setTimeout(async () => {
      submission.status = 'accepted'; // or 'wrong_answer', 'error', etc.
      submission.executionTime = Math.floor(Math.random() * 1000);
      submission.memoryUsed = Math.floor(Math.random() * 10000);
      submission.testCasesPassed = 8;
      submission.totalTestCases = 10;
      submission.output = 'Test cases passed: 8/10';
      await submission.save();
    }, 2000);

    res.status(200).json({
      success: true,
      message: 'Code execution started',
      data: { 
        submissionId: submission._id,
        status: 'running'
      }
    });
  } catch (error) {
    console.error('Run submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while running code'
    });
  }
};

// POST /api/submission/submit - Final submission
const submitSolution = async (req, res) => {
  try {
    const { competitionId, problemIndex, code, language } = req.body;

    if (!competitionId || problemIndex === undefined || !code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Competition ID, problem index, code, and language are required'
      });
    }

    // Verify competition exists and is active
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found'
      });
    }

    if (competition.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Competition is not active'
      });
    }

    // Create final submission
    const submission = await Submission.create({
      competition: competitionId,
      user: req.user.id,
      problemIndex,
      code,
      language,
      status: 'running',
      isSubmission: true
    });

    // Get Socket.io instance
    const io = req.app.get('io');

    // Notify all users in competition about new submission
    if (io) {
      io.to(competitionId).emit('submission-received', {
        userId: req.user.id,
        username: req.user.username,
        problemIndex,
        timestamp: Date.now()
      });
    }

    // Simulate code execution and evaluation
    setTimeout(async () => {
      const allPassed = Math.random() > 0.3; // 70% success rate for demo
      submission.status = allPassed ? 'accepted' : 'wrong_answer';
      submission.executionTime = Math.floor(Math.random() * 1000);
      submission.memoryUsed = Math.floor(Math.random() * 10000);
      submission.testCasesPassed = allPassed ? 10 : Math.floor(Math.random() * 10);
      submission.totalTestCases = 10;
      await submission.save();

      // If accepted, update leaderboard
      if (allPassed) {
        const leaderboardEntry = competition.leaderboard.find(
          entry => entry.user.toString() === req.user.id
        );
        
        if (leaderboardEntry) {
          const problem = competition.problems[problemIndex];
          const points = problem ? problem.points : 100;
          
          // Check if problem not already solved
          const alreadySolved = leaderboardEntry.solvedProblems.some(
            sp => sp.problemIndex === problemIndex
          );

          if (!alreadySolved) {
            leaderboardEntry.score += points;
            leaderboardEntry.solvedProblems.push({
              problemIndex,
              solvedAt: new Date(),
              points
            });
            leaderboardEntry.lastUpdate = new Date();
            await competition.save();

            // Emit real-time leaderboard update
            if (io) {
              const updatedCompetition = await Competition.findById(competitionId)
                .populate('leaderboard.user', 'username email');
              
              const formattedLeaderboard = formatLeaderboard(updatedCompetition);
              
              io.to(competitionId).emit('leaderboard-update', {
                leaderboard: formattedLeaderboard
              });

              io.to(competitionId).emit('submission-accepted', {
                userId: req.user.id,
                username: req.user.username,
                problemIndex,
                points,
                timestamp: Date.now()
              });
            }
          }
        }
      }

      // Notify user of their submission result
      if (io) {
        io.emit('submission-status', {
          submissionId: submission._id,
          userId: req.user.id,
          status: submission.status,
          testCasesPassed: submission.testCasesPassed,
          totalTestCases: submission.totalTestCases,
          executionTime: submission.executionTime,
          memoryUsed: submission.memoryUsed
        });
      }
    }, 2000);

    res.status(201).json({
      success: true,
      message: 'Solution submitted successfully',
      data: { 
        submissionId: submission._id,
        status: 'running'
      }
    });
  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting solution'
    });
  }
};

// Helper function to format leaderboard
const formatLeaderboard = (competition) => {
  if (!competition || !competition.leaderboard) return [];

  const sortedLeaderboard = [...competition.leaderboard].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.lastUpdate) - new Date(b.lastUpdate);
  });

  return sortedLeaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user._id || entry.user,
    username: entry.user.username || 'Unknown',
    score: entry.score,
    solvedProblems: entry.solvedProblems.length,
    lastUpdate: entry.lastUpdate
  }));
};

module.exports = {
  updateCode,
  runSubmission,
  submitSolution
};
