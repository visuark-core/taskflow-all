// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');
const cron = require('node-cron');

// Load env vars
dotenv.config();

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/teams');
const activityRoutes = require('./routes/activities');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

// Middleware imports
const errorHandler = require('./middlewares/errorHandler');

// Cron jobs
const { startCronJobs } = require('./utils/cronJobs');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://remarkable-mandazi-a53c25.netlify.app',
    credentials: true
  }
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://remarkable-mandazi-a53c25.netlify.app',
  credentials: true
}));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  // Start cron jobs after database connection
  startCronJobs();
})
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Error handler middleware (should be last)
app.use(errorHandler);

// Socket.io connection handling
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

