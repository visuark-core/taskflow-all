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
    origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'https://remarkable-mandazi-a53c25.netlify.app'].filter(Boolean),
    credentials: true
  }
});

// Set io instance to be accessible in controllers
app.set('io', io);

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

    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User joined room: user-${userId}`);
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

