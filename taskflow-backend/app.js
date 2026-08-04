// app.js - exports the Express app (no server listen). Also starts DB connection and exposes `ready` promise.
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes (starts with " + process.env.JWT_SECRET.substring(0, 3) + "...)" : "No");

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const clientRoutes = require('./routes/clients');
const serviceRoutes = require('./routes/services');
const invoiceRoutes = require('./routes/invoices');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/teams');
const departmentRoutes = require('./routes/departments');
const activityRoutes = require('./routes/activities');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const chatRoutes = require('./routes/chat');

const errorHandler = require('./middlewares/errorHandler');
const { startCronJobs } = require('./utils/cronJobs');

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'https://remarkable-mandazi-a53c25.netlify.app'].filter(Boolean),
  credentials: true
}));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting (more lenient in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000  // 1000 requests per 15min in dev
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);

// Handle 404s
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler (last)
app.use(errorHandler);

const { sequelize, User } = require('./models');

// Connect to MySQL and expose ready promise so callers can wait
const connectPromise = sequelize.authenticate().then(() => {
  console.log('MySQL connected');
  User.count().then(count => console.log('Total users in DB:', count)).catch(e => console.log('Tables might not be created yet'));
  return true;
}).catch(err => {
  console.error('MySQL connection error:', err);
  throw err;
});

// expose a ready promise to know when DB is connected
app.ready = connectPromise;

module.exports = app;
