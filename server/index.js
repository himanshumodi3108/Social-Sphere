import dns from "node:dns";

// Fix for Node.js querySrv ECONNREFUSED with MongoDB Atlas on local Windows router DNS
if (process.platform === 'win32' && !process.env.RENDER) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch (dnsErr) {
    // Ignore if custom DNS cannot be configured in the current environment
  }
}

try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (dnsErr) {
  // Ignore
}

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

// Create logs and public/images directory if they don't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logsDir = join(__dirname, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const imagesDir = join(__dirname, 'public', 'images');
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
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

// Trust reverse proxy (Render, Vercel, Heroku, Cloudflare, etc.)
// 1 means trust the first proxy hop in front of the app
app.set('trust proxy', 1);

// Load environment variables
dotenv.config();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// CORS configuration
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://himanshu-social-sphere.vercel.app',
  ...(FRONTEND_URL ? [FRONTEND_URL] : [])
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow curl, mobile apps, or same-origin server requests
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  // Allow Vercel deployment subdomains and preview URLs
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(normalized)) return true;
  return false;
};

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    logger.warn('Blocked CORS origin request', { origin });
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Rate limiting for all API routes (excluding static assets and health check)
const apiRoutes = ['/auth', '/user', '/posts', '/upload', '/chat', '/message', '/search', '/notifications', '/stories', '/groups'];
apiRoutes.forEach(route => app.use(route, apiLimiter));

// Rewrite any legacy %PUBLIC_URL% requests
app.use((req, res, next) => {
  if (req.url && req.url.includes('%PUBLIC_URL%')) {
    const cleanUrl = req.url.replace('/%PUBLIC_URL%', '').replace('%PUBLIC_URL%', '');
    return res.redirect(cleanUrl || '/');
  }
  next();
});

// Static file serving with directory resilience and space/underscore fallback
const publicDir = join(__dirname, 'public');

app.use('/images', (req, res, next) => {
  const rawPath = req.path.replace(/^\/+/, '');
  if (!rawPath) return next();
  const filename = decodeURIComponent(rawPath);
  
  const exactPath = join(imagesDir, filename);
  if (existsSync(exactPath)) {
    return res.sendFile(exactPath);
  }
  
  // Try sanitized filename (spaces replaced with underscores)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const sanitizedPath = join(imagesDir, sanitizedFilename);
  if (existsSync(sanitizedPath)) {
    return res.sendFile(sanitizedPath);
  }
  
  next();
});

app.use(express.static(publicDir)); 
app.use('/images', express.static(imagesDir));
if (process.cwd() !== __dirname) {
  app.use(express.static(join(process.cwd(), 'public')));
  app.use('/images', express.static(join(process.cwd(), 'public', 'images')));
}

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

// Serve static client assets if build exists
const clientDistPath = join(__dirname, '../client/dist');
const clientBuildPath = join(__dirname, '../client/build');
const staticPath = existsSync(clientDistPath) ? clientDistPath : (existsSync(clientBuildPath) ? clientBuildPath : null);

if (staticPath) {
  app.use(express.static(staticPath));
}

// SPA fallback for HTML requests (handles page reloads on frontend routes like /chat, /groups, /auth, etc.)
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    if (staticPath && existsSync(join(staticPath, 'index.html'))) {
      return res.sendFile(join(staticPath, 'index.html'));
    }
  }
  next();
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server immediately on 0.0.0.0 so Render detects the open port without delay
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Load MongoDB connection string
const CONNECTION = process.env.MONGO_URI;

if (!CONNECTION) {
  logger.error("❌ CRITICAL: MONGO_URI is not set in environment variables! Please add MONGO_URI in your Render Dashboard under Environment.");
} else {
  // Check if connection string has a database name
  let connectionString = CONNECTION;
  const hasDbName = /mongodb\+?srv?:\/\/[^/]+\/[^/?]+/.test(CONNECTION);

  if (!hasDbName) {
    if (CONNECTION.includes('?')) {
      connectionString = CONNECTION.includes('/?')
        ? CONNECTION.replace(/\/\?/, '/socialsphere?')
        : CONNECTION.replace(/\?/, '/socialsphere?');
    } else {
      connectionString = CONNECTION.endsWith('/')
        ? CONNECTION + 'socialsphere'
        : CONNECTION + '/socialsphere';
    }
  }

  // Connect to MongoDB with automatic retry
  const connectWithRetry = () => {
    logger.info("Attempting MongoDB connection...");
    mongoose
      .connect(connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000,
      })
      .then(() => {
        logger.info("MongoDB connected successfully", {
          database: mongoose.connection.db?.databaseName || "Connected",
          host: mongoose.connection.host || "Connected"
        });
      })
      .catch((error) => {
        logger.error("MongoDB connection error", {
          error: error.message,
        });
        logger.error("Troubleshooting: Check Render Environment variables (MONGO_URI) and Atlas IP Access List (allow 0.0.0.0/0). Retrying in 10 seconds...");
        setTimeout(connectWithRetry, 10000);
      });
  };

  connectWithRetry();
}

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  logger.error("MongoDB error", { error: err.message });
});