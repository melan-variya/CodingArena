require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initializeSocketHandler } = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development (including file://)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Initialize socket handler
initializeSocketHandler(io);

// Make io accessible to routes/controllers
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server initialized`);
});
