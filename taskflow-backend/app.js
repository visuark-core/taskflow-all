// app.js - exports the Express app (no server listen). Also starts DB connection and exposes `ready` promise.
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/teams');
const activityRoutes = require('./routes/activities');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

const errorHandler = require('./middlewares/errorHandler');
const { startCronJobs } = require('./utils/cronJobs');

const app = express();

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
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Error handler (last)
app.use(errorHandler);

// Connect to MongoDB and expose ready promise so callers can wait
const connectPromise = mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  return true;
}).catch(err => {
  console.error('MongoDB connection error:', err);
  throw err;
});

// expose a ready promise to know when DB is connected
app.ready = connectPromise;

module.exports = app;
