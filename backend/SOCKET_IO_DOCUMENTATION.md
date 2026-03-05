# Socket.io Real-Time Communication Documentation

## Week 8 - Real-Time Features Implementation

This document describes the Socket.io integration for real-time communication in CodingArena.

## Features Implemented

### 1. **WebSocket Server Setup**
- Socket.io server integrated with Express HTTP server
- JWT authentication middleware for secure connections
- CORS configuration for cross-origin requests
- Persistent connection tracking

### 2. **Real-Time Code Synchronization**
- Live code editing with cursor position tracking
- Multi-device synchronization
- Automatic code state backup to database
- Broadcast code changes to all participants in competition

### 3. **Timer Synchronization System**
- Server-side timer management
- Real-time countdown updates (1-second intervals)
- Automatic competition end when timer expires
- Synchronized timer across all connected clients

### 4. **Leaderboard Live Updates**
- Instant leaderboard updates on submission acceptance
- Real-time rank changes
- Score updates broadcast to all participants
- Optimized sorting and formatting

### 5. **Additional Real-Time Features**
- User join/leave notifications
- Competition start/end broadcasts
- Submission status updates
- Focused player tracking (for broadcaster mode)
- Real-time chat/messaging

---

## Connection & Authentication

### Client Connection Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Authentication
- Token must be provided in `auth.token` or `Authorization` header
- Token is verified using JWT_SECRET from environment
- Invalid tokens will receive authentication error

---

## Socket Events Reference

### 📥 **Client → Server Events**

#### `join-competition`
Join a competition room to receive real-time updates.

```javascript
socket.emit('join-competition', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0'
});
```

**Response Events:**
- `competition-joined` - Competition state and details
- `leaderboard-update` - Current leaderboard
- `user-joined` - Notification to other users

---

#### `code-update`
Broadcast code changes to other participants (for collaboration/viewing).

```javascript
socket.emit('code-update', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0',
  problemIndex: 0,
  code: 'function solution() { ... }',
  language: 'javascript',
  cursorPosition: { line: 10, column: 5 }
});
```

**Response Events:**
- `code-synced` - Broadcast to others in room

---

#### `code-submit`
Notify others when submitting code.

```javascript
socket.emit('code-submit', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0',
  problemIndex: 0,
  code: 'function solution() { ... }',
  language: 'javascript'
});
```

**Response Events:**
- `submission-received` - Broadcast to all in room

---

#### `competition-start`
Start a competition (organizer only).

```javascript
socket.emit('competition-start', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0'
});
```

**Response Events:**
- `competition-started` - Broadcast to all participants
- Timer updates begin

---

#### `competition-end`
End a competition (organizer only).

```javascript
socket.emit('competition-end', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0'
});
```

**Response Events:**
- `competition-ended` - Broadcast to all participants
- Timer stops

---

#### `focus-player`
Set focused player for broadcaster mode.

```javascript
socket.emit('focus-player', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0',
  focusedUserId: '65f4a8b9c8d4e5f6a7b8c9d1',
  focusedUsername: 'john_doe'
});
```

**Response Events:**
- `player-focused` - Broadcast to all viewers

---

#### `send-message`
Send a chat message to competition room.

```javascript
socket.emit('send-message', {
  competitionId: '65f4a8b9c8d4e5f6a7b8c9d0',
  message: 'Good luck everyone!'
});
```

**Response Events:**
- `new-message` - Broadcast to all in room

---

#### `leave-competition`
Leave a competition room.

```javascript
socket.emit('leave-competition');
```

**Response Events:**
- `user-left` - Broadcast to others in room

---

### 📤 **Server → Client Events**

#### `competition-joined`
Received after successfully joining a competition.

```javascript
socket.on('competition-joined', (data) => {
  console.log('Joined competition:', data);
  // {
  //   competitionId: '...',
  //   competition: {
  //     title: 'Algorithm Challenge',
  //     status: 'active',
  //     startTime: '2026-03-05T10:00:00Z',
  //     endTime: '2026-03-05T11:00:00Z',
  //     duration: 60,
  //     problems: [...]
  //   }
  // }
});
```

---

#### `timer-update`
Real-time timer updates (every second).

```javascript
socket.on('timer-update', (data) => {
  console.log('Time remaining:', data.formatted);
  // {
  //   remainingMs: 3599000,
  //   remainingSeconds: 3599,
  //   minutes: 59,
  //   seconds: 59,
  //   formatted: '59:59'
  // }
});
```

---

#### `leaderboard-update`
Real-time leaderboard updates.

```javascript
socket.on('leaderboard-update', (data) => {
  console.log('Leaderboard updated:', data.leaderboard);
  // {
  //   leaderboard: [
  //     {
  //       rank: 1,
  //       userId: '...',
  //       username: 'alice',
  //       score: 300,
  //       solvedProblems: 3,
  //       lastUpdate: '2026-03-05T10:30:00Z'
  //     },
  //     ...
  //   ]
  // }
});
```

---

#### `code-synced`
Received when another user updates their code.

```javascript
socket.on('code-synced', (data) => {
  console.log('Code updated by:', data.username);
  // {
  //   userId: '...',
  //   username: 'bob',
  //   problemIndex: 0,
  //   code: 'function solution() { ... }',
  //   language: 'javascript',
  //   cursorPosition: { line: 10, column: 5 },
  //   timestamp: 1709636400000
  // }
});
```

---

#### `submission-received`
Notification when a user submits code.

```javascript
socket.on('submission-received', (data) => {
  console.log('Submission from:', data.username);
  // {
  //   userId: '...',
  //   username: 'charlie',
  //   problemIndex: 1,
  //   timestamp: 1709636400000
  // }
});
```

---

#### `submission-accepted`
Notification when a submission is accepted and scores points.

```javascript
socket.on('submission-accepted', (data) => {
  console.log('Accepted submission:', data);
  // {
  //   userId: '...',
  //   username: 'david',
  //   problemIndex: 2,
  //   points: 100,
  //   timestamp: 1709636400000
  // }
});
```

---

#### `submission-status`
Personal notification about submission result.

```javascript
socket.on('submission-status', (data) => {
  console.log('Your submission result:', data);
  // {
  //   submissionId: '...',
  //   userId: '...',
  //   status: 'accepted', // or 'wrong_answer', 'error', etc.
  //   testCasesPassed: 10,
  //   totalTestCases: 10,
  //   executionTime: 245,
  //   memoryUsed: 5432
  // }
});
```

---

#### `competition-started`
Notification when competition starts.

```javascript
socket.on('competition-started', (data) => {
  console.log('Competition started!', data);
  // {
  //   competitionId: '...',
  //   startTime: '2026-03-05T10:00:00Z',
  //   endTime: '2026-03-05T11:00:00Z',
  //   duration: 60
  // }
});
```

---

#### `competition-ended`
Notification when competition ends.

```javascript
socket.on('competition-ended', (data) => {
  console.log('Competition ended!', data);
  // {
  //   competitionId: '...',
  //   endTime: '2026-03-05T11:00:00Z',
  //   status: 'ended',
  //   finalLeaderboard: [...]
  // }
});
```

---

#### `player-focused`
Notification about focused player change (broadcaster mode).

```javascript
socket.on('player-focused', (data) => {
  console.log('Now focusing on:', data.focusedUsername);
  // {
  //   focusedUserId: '...',
  //   focusedUsername: 'eve',
  //   timestamp: 1709636400000
  // }
});
```

---

#### `user-joined`
Notification when another user joins the competition.

```javascript
socket.on('user-joined', (data) => {
  console.log('User joined:', data.username);
  // {
  //   userId: '...',
  //   username: 'frank'
  // }
});
```

---

#### `user-left`
Notification when another user leaves the competition.

```javascript
socket.on('user-left', (data) => {
  console.log('User left:', data.username);
  // {
  //   userId: '...',
  //   username: 'grace'
  // }
});
```

---

#### `new-message`
Chat message received.

```javascript
socket.on('new-message', (data) => {
  console.log(`${data.username}: ${data.message}`);
  // {
  //   userId: '...',
  //   username: 'henry',
  //   message: 'Great competition!',
  //   timestamp: 1709636400000
  // }
});
```

---

#### `error`
Error notification from server.

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
  // {
  //   message: 'Competition not found'
  // }
});
```

---

## Architecture Overview

### Connection Lifecycle

1. **Client connects** with JWT token
2. **Server authenticates** token and stores connection
3. **Client joins competition room** using `join-competition`
4. **Server sends initial state** (competition data, leaderboard)
5. **Real-time updates** flow bidirectionally
6. **Timer starts** if competition is active
7. **Client disconnects** or leaves room when done

### Room Management

- Each competition has a unique room identified by `competitionId`
- Users join rooms to receive competition-specific updates
- Room membership is tracked server-side
- Automatic cleanup when all users leave a room

### Timer System

- Server-side timer for each active competition
- Updates sent every 1 second via `timer-update` event
- Automatic competition end when timer expires
- Timer cleanup on competition end or room empty

### Data Flow

```
Client Action (emit) → Server Processing → Database Update → Broadcast (emit)
                                                            ↓
                                               All clients in room receive update
```

---

## Testing

### Test Client HTML
See `test-socket-client.html` for a complete testing interface.

### Testing Checklist

- ✅ Authentication with valid JWT token
- ✅ Join competition room
- ✅ Receive timer updates
- ✅ Send and receive code updates
- ✅ Submit code and receive status
- ✅ Leaderboard updates on acceptance
- ✅ Competition start/end events
- ✅ User join/leave notifications
- ✅ Focus player switching
- ✅ Chat messaging
- ✅ Multi-device synchronization
- ✅ Disconnection handling

---

## Performance Considerations

1. **Connection Limits**: Socket.io handles thousands of concurrent connections efficiently
2. **Event Throttling**: Code updates can be throttled on client side if needed
3. **Database Optimization**: Leaderboard updates use in-memory sorting before broadcast
4. **Room Isolation**: Events are scoped to competition rooms for efficiency

---

## Security

1. **JWT Authentication**: All connections must authenticate with valid JWT
2. **Room Authorization**: Users can only join competitions they're part of
3. **Organizer Checks**: Start/end/focus operations verify organizer role
4. **Input Validation**: All incoming events validate required fields

---

## Error Handling

- Invalid authentication returns `connect_error`
- Missing/invalid data emits `error` event to client
- Database errors logged server-side
- Automatic reconnection on disconnection

---

## Future Enhancements

- Video/audio streaming for live broadcasting
- Screen sharing for code walkthroughs
- Collaborative code editing (operational transforms)
- Analytics and metrics tracking
- Rate limiting for event spam protection

---

## Troubleshooting

### Connection Issues
- Verify JWT token is valid and not expired
- Check CORS configuration in server.js
- Ensure CLIENT_URL in .env matches your frontend URL

### Timer Not Syncing
- Verify competition status is 'active'
- Check competition has valid startTime and endTime
- Confirm user is in competition room

### Leaderboard Not Updating
- Verify submission was accepted (status: 'accepted')
- Check user hasn't already solved the problem
- Confirm Socket.io instance is passed to controllers

---

## Technical Stack

- **Socket.io**: ^4.6.0
- **jsonwebtoken**: ^9.0.2
- **Node.js**: >=18.0.0
- **MongoDB**: For persistent storage

---

**Implementation Date**: March 5, 2026  
**Version**: 1.0.0  
**Week**: 8 - Real-Time Communication Integration
