import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import compression from "compression";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Fix Mongoose deprecation warning
mongoose.set('strictQuery', false);

// Create logs directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logsDir = join(__dirname, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}


// routes
import AuthRoute from './routes/AuthRoute.js'
import UserRoute from './routes/UserRoute.js'
import PostRoute from './routes/PostRoute.js'
import UploadRoute from './routes/UploadRoute.js'
import ChatRoute from './routes/ChatRoute.js'
import MessageRoute from './routes/MessageRoute.js'
import SearchRoute from './routes/SearchRoute.js'
import NotificationRoute from './routes/NotificationRoute.js'
import StoryRoute from './routes/StoryRoute.js'
import GroupRoute from './routes/GroupRoute.js'

const app = express();

// Load environment variables
dotenv.config();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  'http://localhost:3000',
  FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Static file serving
app.use(express.static('public')); 
app.use('/images', express.static('public/images'));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    originalUrl: req.originalUrl
  });
  // Log group routes specifically
  // if (req.path.startsWith('/groups/')) {
  //   console.log(`[GROUP ROUTE] ${req.method} ${req.path}`, req.params);
  // }
  next();
});

// Register routes BEFORE database connection
app.use('/auth', AuthRoute);
app.use('/user', UserRoute);
app.use('/posts', PostRoute);
app.use('/upload', UploadRoute);
app.use('/chat', ChatRoute);
app.use('/message', MessageRoute);
app.use('/search', SearchRoute);
app.use('/notifications', NotificationRoute);
app.use('/stories', StoryRoute);
app.use('/groups', GroupRoute);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Load MongoDB connection string
const CONNECTION = process.env.MONGO_URI;

if (!CONNECTION) {
  // console.error("❌ ERROR: MONGO_URI is not set in .env file!");
  process.exit(1);
}

// Check if connection string has a database name
// MongoDB connection strings format: mongodb+srv://user:pass@host/dbname?options
let connectionString = CONNECTION;
const hasDbName = /mongodb\+?srv?:\/\/[^/]+\/[^/?]+/.test(CONNECTION);

if (!hasDbName) {
  // console.warn("⚠️  WARNING: No database name in connection string.");
  // console.warn("📝 Adding 'socialsphere' as database name...");
  
  // Properly insert database name before query parameters
  if (CONNECTION.includes('?')) {
    // Handle both /? and ? cases
    if (CONNECTION.includes('/?')) {
      // Replace /? with /socialsphere?
      connectionString = CONNECTION.replace(/\/\?/, '/socialsphere?');
    } else {
      // Replace ? with /socialsphere?
      connectionString = CONNECTION.replace(/\?/, '/socialsphere?');
    }
  } else {
    // Add /socialsphere at the end
    connectionString = CONNECTION.endsWith('/') 
      ? CONNECTION + 'socialsphere'
      : CONNECTION + '/socialsphere';
  }
  
  // Mask credentials in log
  // const maskedConnection = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  // console.log("📝 Using connection:", maskedConnection);
} else {
  // Mask credentials in log
  // const maskedConnection = CONNECTION.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  // console.log("📝 Connecting to:", maskedConnection);
}

// Connect to MongoDB
mongoose
  .connect(connectionString, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
  })
  .then(() => {
    logger.info("MongoDB connected successfully", {
      database: mongoose.connection.db?.databaseName || "Connected",
      host: mongoose.connection.host || "Connected"
    });
    
    // Start server only after successful connection
    app.listen(PORT, () => {
      logger.info(`Server listening at Port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    });
  })
  .catch((error) => {
    logger.error("MongoDB connection error", { 
      error: error.message,
      stack: error.stack
    });
    logger.error("Troubleshooting tips: Check MONGO_URI, IP whitelist, credentials, and internet connection");
    process.exit(1);
  });

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  logger.error("MongoDB error", { error: err.message, stack: err.stack });
});