const jwt = require('jsonwebtoken');
const Competition = require('../models/Competition');
const Submission = require('../models/Submission');

// Store active connections
const activeUsers = new Map(); // userId -> { socketId, competitionId, username }
const competitionRooms = new Map(); // competitionId -> Set of socketIds
const competitionTimers = new Map(); // competitionId -> intervalId

// Socket.io authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    socket.role = decoded.role;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.io handler
const initializeSocketHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
    
    // Store user connection
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      competitionId: null
    });

    // Join competition room
    socket.on('join-competition', async (data) => {
      try {
        const { competitionId } = data;
        
        // Leave previous competition room if any
        if (socket.competitionId) {
          socket.leave(socket.competitionId);
          removeFromCompetitionRoom(socket.competitionId, socket.id);
        }

        // Join new competition room
        socket.join(competitionId);
        socket.competitionId = competitionId;
        
        // Update active users
        const userInfo = activeUsers.get(socket.userId);
        if (userInfo) {
          userInfo.competitionId = competitionId;
        }

        // Add to competition room tracking
        if (!competitionRooms.has(competitionId)) {
          competitionRooms.set(competitionId, new Set());
        }
        competitionRooms.get(competitionId).add(socket.id);

        // Fetch competition data
        const competition = await Competition.findById(competitionId)
          .populate('participants.user', 'username email')
          .populate('leaderboard.user', 'username email');

        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        // Send current competition state
        socket.emit('competition-joined', {
          competitionId,
          competition: {
            title: competition.title,
            status: competition.status,
            startTime: competition.startTime,
            endTime: competition.endTime,
            duration: competition.duration,
            problems: competition.problems
          }
        });

        // Send current leaderboard
        socket.emit('leaderboard-update', {
          leaderboard: formatLeaderboard(competition)
        });

        // Notify others in room
        socket.to(competitionId).emit('user-joined', {
          userId: socket.userId,
          username: socket.username
        });

        // Start timer if competition is active
        if (competition.status === 'active' && !competitionTimers.has(competitionId)) {
          startCompetitionTimer(io, competitionId, competition);
        }

        console.log(`👥 ${socket.username} joined competition: ${competitionId}`);
      } catch (error) {
        console.error('Join competition error:', error);
        socket.emit('error', { message: 'Failed to join competition' });
      }
    });

    // Real-time code synchronization
    socket.on('code-update', async (data) => {
      try {
        const { competitionId, problemIndex, code, language, cursorPosition } = data;

        // Broadcast code update to others in the same competition
        socket.to(competitionId).emit('code-synced', {
          userId: socket.userId,
          username: socket.username,
          problemIndex,
          code,
          language,
          cursorPosition,
          timestamp: Date.now()
        });

        // Optionally save code state to database
        await Submission.create({
          competition: competitionId,
          user: socket.userId,
          problemIndex,
          code,
          language,
          status: 'pending',
          isSubmission: false
        });

        console.log(`💾 Code synced for ${socket.username} - Problem ${problemIndex}`);
      } catch (error) {
        console.error('Code sync error:', error);
      }
    });

    // Code submission event
    socket.on('code-submit', async (data) => {
      try {
        const { competitionId, problemIndex, code, language } = data;

        // Broadcast submission notification
        io.to(competitionId).emit('submission-received', {
          userId: socket.userId,
          username: socket.username,
          problemIndex,
          timestamp: Date.now()
        });

        console.log(`🎯 Submission from ${socket.username} - Problem ${problemIndex}`);
      } catch (error) {
        console.error('Submission error:', error);
      }
    });

    // Submission result event
    socket.on('submission-result', async (data) => {
      try {
        const { competitionId, submissionId, status, points } = data;

        // Update leaderboard if submission was accepted
        if (status === 'accepted' && points) {
          const competition = await Competition.findById(competitionId)
            .populate('leaderboard.user', 'username email');

          if (competition) {
            // Broadcast updated leaderboard to all in room
            io.to(competitionId).emit('leaderboard-update', {
              leaderboard: formatLeaderboard(competition)
            });
          }
        }

        // Notify user of result
        socket.emit('submission-status', {
          submissionId,
          status,
          points: points || 0
        });

        console.log(`✅ Submission result: ${status} for ${socket.username}`);
      } catch (error) {
        console.error('Submission result error:', error);
      }
    });

    // Competition status change (start/end)
    socket.on('competition-start', async (data) => {
      try {
        const { competitionId } = data;

        const competition = await Competition.findById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        // Check if user is organizer
        if (competition.organizer.toString() !== socket.userId) {
          socket.emit('error', { message: 'Only organizer can start competition' });
          return;
        }

        // Start competition
        competition.status = 'active';
        competition.startTime = new Date();
        competition.endTime = new Date(Date.now() + competition.duration * 60 * 1000);
        await competition.save();

        // Broadcast to all participants
        io.to(competitionId).emit('competition-started', {
          startTime: competition.startTime,
          endTime: competition.endTime,
          duration: competition.duration
        });

        // Start timer
        startCompetitionTimer(io, competitionId, competition);

        console.log(`🚀 Competition started: ${competitionId}`);
      } catch (error) {
        console.error('Competition start error:', error);
        socket.emit('error', { message: 'Failed to start competition' });
      }
    });

    socket.on('competition-end', async (data) => {
      try {
        const { competitionId } = data;

        const competition = await Competition.findById(competitionId);
        if (!competition) {
          socket.emit('error', { message: 'Competition not found' });
          return;
        }

        // Check if user is organizer
        if (competition.organizer.toString() !== socket.userId) {
          socket.emit('error', { message: 'Only organizer can end competition' });
          return;
        }

        // End competition
        competition.status = 'ended';
        competition.endTime = new Date();
        await competition.save();

        // Stop timer
        stopCompetitionTimer(competitionId);

        // Broadcast to all participants
        io.to(competitionId).emit('competition-ended', {
          endTime: competition.endTime,
          finalLeaderboard: formatLeaderboard(competition)
        });

        console.log(`🏁 Competition ended: ${competitionId}`);
      } catch (error) {
        console.error('Competition end error:', error);
        socket.emit('error', { message: 'Failed to end competition' });
      }
    });

    // Focused player update (broadcaster feature)
    socket.on('focus-player', (data) => {
      const { competitionId, focusedUserId, focusedUsername } = data;
      
      // Broadcast to all viewers
      socket.to(competitionId).emit('player-focused', {
        focusedUserId,
        focusedUsername,
        timestamp: Date.now()
      });

      console.log(`🎥 Focus switched to: ${focusedUsername}`);
    });

    // Chat/messaging
    socket.on('send-message', (data) => {
      const { competitionId, message } = data;
      
      io.to(competitionId).emit('new-message', {
        userId: socket.userId,
        username: socket.username,
        message,
        timestamp: Date.now()
      });
    });

    // Leave competition room
    socket.on('leave-competition', () => {
      if (socket.competitionId) {
        socket.to(socket.competitionId).emit('user-left', {
          userId: socket.userId,
          username: socket.username
        });

        socket.leave(socket.competitionId);
        removeFromCompetitionRoom(socket.competitionId, socket.id);
        socket.competitionId = null;

        console.log(`👋 ${socket.username} left competition`);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username}`);

      if (socket.competitionId) {
        socket.to(socket.competitionId).emit('user-left', {
          userId: socket.userId,
          username: socket.username
        });

        removeFromCompetitionRoom(socket.competitionId, socket.id);
      }

      activeUsers.delete(socket.userId);
    });
  });

  console.log('🔌 Socket.io handler initialized');
};

// Helper function to start competition timer
const startCompetitionTimer = (io, competitionId, competition) => {
  // Clear existing timer if any
  if (competitionTimers.has(competitionId)) {
    clearInterval(competitionTimers.get(competitionId));
  }

  // Send timer update every second
  const intervalId = setInterval(async () => {
    const now = Date.now();
    const endTime = new Date(competition.endTime).getTime();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      // Competition ended
      clearInterval(intervalId);
      competitionTimers.delete(competitionId);

      // Update competition status
      competition.status = 'ended';
      await competition.save();

      io.to(competitionId).emit('competition-ended', {
        endTime: competition.endTime,
        finalLeaderboard: formatLeaderboard(competition)
      });

      console.log(`⏱️ Competition timer expired: ${competitionId}`);
    } else {
      // Send timer update
      const remainingSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;

      io.to(competitionId).emit('timer-update', {
        remainingMs,
        remainingSeconds,
        minutes,
        seconds,
        formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`
      });
    }
  }, 1000);

  competitionTimers.set(competitionId, intervalId);
  console.log(`⏱️ Timer started for competition: ${competitionId}`);
};

// Helper function to stop competition timer
const stopCompetitionTimer = (competitionId) => {
  if (competitionTimers.has(competitionId)) {
    clearInterval(competitionTimers.get(competitionId));
    competitionTimers.delete(competitionId);
    console.log(`⏱️ Timer stopped for competition: ${competitionId}`);
  }
};

// Helper function to remove socket from competition room
const removeFromCompetitionRoom = (competitionId, socketId) => {
  if (competitionRooms.has(competitionId)) {
    competitionRooms.get(competitionId).delete(socketId);
    if (competitionRooms.get(competitionId).size === 0) {
      competitionRooms.delete(competitionId);
      stopCompetitionTimer(competitionId);
    }
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

// Export socket handler and utilities
module.exports = {
  initializeSocketHandler,
  authenticateSocket,
  activeUsers,
  competitionRooms
};
