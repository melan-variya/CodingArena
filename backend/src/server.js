require('dotenv').config();
const app = require('./app');
const http = require('http');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});
