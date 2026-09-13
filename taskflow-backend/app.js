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
const salaryRoutes = require('./routes/salaries');
const billingSettingsRoutes = require('./routes/billingSettings');
const companyRoutes = require('./routes/companies');

const errorHandler = require('./middlewares/errorHandler');
const { startCronJobs } = require('./utils/cronJobs');
const { ensureDefaultAdmin } = require('./utils/ensureDefaultAdmin');

const app = express();

// In-memory request log buffer for Vercel diagnostics
global.requestLogs = global.requestLogs || [];
app.use((req, res, next) => {
  const logEntry = {
    time: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      authorization: req.headers.authorization ? 'Bearer Present' : 'None'
    },
    status: 'pending',
    duration: 0
  };
  global.requestLogs.push(logEntry);
  if (global.requestLogs.length > 100) {
    global.requestLogs.shift();
  }
  
  const start = Date.now();
  res.on('finish', () => {
    logEntry.status = res.statusCode;
    logEntry.duration = Date.now() - start;
  });
  
  next();
});

// Trust reverse proxy (Vercel) for rate-limiting
app.set('trust proxy', 1);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://remarkable-mandazi-a53c25.netlify.app',
  'https://taskflow.visuark.com',
  'https://www.taskflow.visuark.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.endsWith('.netlify.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.get('/api/request-logs', (req, res) => {
  res.json({
    success: true,
    count: global.requestLogs.length,
    logs: global.requestLogs
  });
});

const frontendDistPath = process.env.FRONTEND_DIST_PATH || path.join(__dirname, '../tailwind-frontend/dist');
const hasFrontend = require('fs').existsSync(frontendDistPath);

if (hasFrontend) {
  app.use(express.static(frontendDistPath));
} else {
  app.get('/', async (req, res) => {
    try {
      const { User } = require('./models');
      const count = await User.count();
      res.send(`Backend is running successfully and API connected successfully! Total users in DB: ${count}`);
    } catch (err) {
      res.status(500).send(`Backend is running, but database connection failed: ${err.message}`);
    }
  });
}

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
app.use('/api/salaries', salaryRoutes);
app.use('/api/billing-settings', billingSettingsRoutes);
app.use('/api/companies', companyRoutes);

// Temporary endpoint to trigger db sync on Vercel
app.get('/api/db-sync', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.sync({ alter: true });
    res.send("Database synchronized successfully!");
  } catch (err) {
    res.status(500).send("Sync failed: " + err.message);
  }
});

if (hasFrontend) {
  // For SPA routing, redirect all non-API/non-upload requests to index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Handle 404s
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler (last)
app.use(errorHandler);

const connectPromise = (async () => {
  try {
    const { sequelize } = require('./models');
    // Best-effort: add 'marketer' to the role enum on an existing Users table.
    try {
      await sequelize.query(`ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'marketer';`);
      console.log('[Startup] Role enum updated successfully (added marketer)');
    } catch (err) {
      console.warn('[Startup] Could not alter enum type enum_Users_role to add marketer:', err.message);
    }
    // Ensure the primary schema (Users, Companies, ...) exists. Deterministic:
    // creates only the specific global tables that are missing (never alters or
    // drops existing ones), so it is safe on databases with legacy tables.
    try {
      const ensurePrimarySchema = require("./utils/ensurePrimarySchema");
      await ensurePrimarySchema();
    } catch (err) {
      console.warn("[Startup] ensurePrimarySchema init failed:", err.message);
    }

    try {
      const { User } = require('./models');
      const defaultAdminResult = await ensureDefaultAdmin(User);
      if (defaultAdminResult.created) {
        console.log('[Startup] Created default admin account:', defaultAdminResult.user.email);
      } else if (defaultAdminResult.user) {
        console.log('[Startup] Default admin already exists:', defaultAdminResult.user.email);
      }
    } catch (err) {
      console.warn('[Startup] Default admin bootstrap failed:', err.message);
    }
  } catch (err) {
    console.warn('[Startup] DB connect error:', err.message);
  }
  return true;
})();

// expose a ready promise to know when DB is connected
app.ready = connectPromise;

module.exports = app;
