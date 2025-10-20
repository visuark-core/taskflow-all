// server.js - persistent server entrypoint (uses app.js)
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const { startCronJobs } = require('./utils/cronJobs');

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://remarkable-mandazi-a53c25.netlify.app',
    credentials: true
  }
});

// attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Wait for DB connection then start cron and server
const PORT = process.env.PORT || 5000;
app.ready.then(() => {
  console.log('Starting persistent server...');
  // start cron jobs
  startCronJobs();

  // socket handlers
  io.on('connection', (socket) => {
    console.log('New socket connection');

    socket.on('join-project', (projectId) => {
      socket.join(`project-${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
      socket.leave(`project-${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server due to DB connection error', err);
});

