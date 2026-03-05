# CodingArena Backend

Backend server for CodingArena - A competitive programming platform with real-time collaboration features.

## 🚀 Features

### Core Features
- **User Authentication** - JWT-based authentication system
- **Competition Management** - Create, start, end, and manage coding competitions
- **Code Submission System** - Submit solutions with automated evaluation
- **Leaderboard System** - Real-time ranking and scoring
- **Broadcaster Mode** - Focus on specific players for live streaming

### Week 8: Real-Time Communication (✅ Completed)
- **Socket.io Integration** - WebSocket communication for real-time updates
- **Real-time Code Synchronization** - Live code editing and sharing across devices
- **Timer Synchronization** - Server-side timer with live countdown updates
- **Leaderboard Live Updates** - Instant leaderboard changes on submissions
- **Multi-device Synchronization** - Seamless experience across multiple devices
- **Competition Events** - Real-time notifications for start/end/submissions
- **User Presence** - Track and display active users in competitions

## 📋 Tech Stack

- **Node.js** (≥18.0.0)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **Socket.io** (^4.6.0) - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 🛠️ Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codearena
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Competitions
- `POST /api/competition/create` - Create competition
- `GET /api/competition/:id` - Get competition details
- `POST /api/competition/:id/start` - Start competition (organizer only)
- `POST /api/competition/:id/end` - End competition (organizer only)
- `POST /api/competition/:id/join` - Join competition
- `GET /api/competition/:id/players` - Get player list
- `POST /api/competition/:id/focus` - Set focused player (organizer only)

### Submissions
- `POST /api/code/update` - Save code state
- `POST /api/submission/run` - Run solution
- `POST /api/submission/submit` - Submit final solution

### Leaderboard
- `GET /api/leaderboard/:id` - Get leaderboard
- `POST /api/leaderboard/update` - Update leaderboard (internal)

### Broadcast
- `POST /api/broadcast/focus` - Set focused player
- `GET /api/broadcast/:competitionId/focused` - Get focused player

## 🔌 Socket.io Events

### Client → Server Events
- `join-competition` - Join competition room
- `code-update` - Broadcast code changes
- `code-submit` - Submit code for evaluation
- `competition-start` - Start competition
- `competition-end` - End competition
- `focus-player` - Set focused player
- `send-message` - Send chat message
- `leave-competition` - Leave competition room

### Server → Client Events
- `competition-joined` - Competition joined successfully
- `timer-update` - Timer countdown (1s intervals)
- `leaderboard-update` - Leaderboard changed
- `code-synced` - Code updated by another user
- `submission-received` - New submission notification
- `submission-accepted` - Submission accepted with points
- `submission-status` - Personal submission result
- `competition-started` - Competition started
- `competition-ended` - Competition ended
- `player-focused` - Focused player changed
- `user-joined` - User joined competition
- `user-left` - User left competition
- `new-message` - Chat message received
- `error` - Error notification

For detailed Socket.io documentation, see [SOCKET_IO_DOCUMENTATION.md](./SOCKET_IO_DOCUMENTATION.md)

## 🧪 Testing

### Test the Socket.io integration
1. Open `test-socket-client.html` in your browser
2. Enter your JWT token (get one by logging in via API)
3. Click "Connect" to establish WebSocket connection
4. Enter a competition ID and click "Join Competition"
5. Test various features:
   - Watch timer countdown
   - Sync code changes
   - Submit solutions
   - View live leaderboard updates
   - Test multi-device synchronization (open multiple browser tabs)

### Manual API Testing
Use tools like Postman or curl:

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js       # Authentication logic
│   │   ├── broadcast.controller.js  # Broadcaster features
│   │   ├── competition.controller.js # Competition management
│   │   ├── leaderboard.controller.js # Leaderboard logic
│   │   └── submission.controller.js  # Code submission
│   ├── middleware/
│   │   └── auth.middleware.js       # JWT verification
│   ├── models/
│   │   ├── Competition.js           # Competition schema
│   │   ├── Submission.js            # Submission schema
│   │   └── User.js                  # User schema
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── broadcast.routes.js
│   │   ├── competition.routes.js
│   │   ├── leaderboard.routes.js
│   │   └── submission.routes.js
│   ├── socket/
│   │   └── socketHandler.js         # Socket.io event handlers
│   ├── app.js                       # Express app setup
│   └── server.js                    # Server entry point
├── .env.example                     # Environment template
├── package.json
├── README.md
├── SOCKET_IO_DOCUMENTATION.md       # Detailed Socket.io docs
└── test-socket-client.html          # Socket.io test interface
```

## 🔐 Security

- JWT authentication for all protected routes
- Password hashing with bcryptjs
- Socket.io authentication middleware
- Organizer-only actions verification
- Input validation and sanitization
- CORS configuration

## 📊 Database Models

### User
- username, email, password (hashed)
- role (user/organizer/admin)
- timestamps

### Competition
- title, description, status
- problems, duration
- organizer, participants, leaderboard
- startTime, endTime, focusedPlayer
- timestamps

### Submission
- user, competition, problemIndex
- code, language, status
- executionTime, memoryUsed
- testCasesPassed, totalTestCases
- isSubmission (final vs. backup)
- timestamps

## 🎯 Real-Time Features Details

### Code Synchronization
- Automatic backup every code change
- Cursor position tracking
- Multi-user viewing capability
- Database persistence

### Timer System
- Server-authoritative timer
- 1-second update intervals
- Automatic competition end
- Synchronized across all clients

### Leaderboard Updates
- Instant score updates
- Real-time rank changes
- Optimized sorting algorithm
- Sub-second latency

### Multi-Device Support
- Same user across multiple devices
- Session persistence
- Automatic reconnection
- State synchronization

## 🚧 Future Enhancements

- [ ] Code execution sandboxing
- [ ] Advanced test case evaluation
- [ ] Video/audio streaming
- [ ] Collaborative code editing (OT/CRDT)
- [ ] Analytics and metrics
- [ ] Rate limiting
- [ ] Redis for session management
- [ ] Microservices architecture

## 📝 Development Notes

### Week 8 Implementation (March 5, 2026)
- ✅ Integrated Socket.io server with Express
- ✅ Implemented JWT authentication for WebSockets
- ✅ Created comprehensive event system
- ✅ Developed timer synchronization with auto-end
- ✅ Implemented real-time code synchronization
- ✅ Added live leaderboard updates
- ✅ Built test client interface
- ✅ Documented all Socket.io events
- ✅ Tested multi-device synchronization
- ✅ Added room management and user tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

ISC

## 👥 Authors

CodingArena Development Team

## 🆘 Support

For issues and questions:
- Check [SOCKET_IO_DOCUMENTATION.md](./SOCKET_IO_DOCUMENTATION.md)
- Review error logs in console
- Test with `test-socket-client.html`
- Ensure MongoDB is running
- Verify .env configuration

---

**Last Updated**: March 5, 2026  
**Version**: 1.0.0  
**Status**: Week 8 Completed ✅

