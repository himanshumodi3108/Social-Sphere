import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT ? parseInt(process.env.API_RATE_LIMIT) : 500, // Limit each IP to 500 requests per 15 minutes for SPA traffic
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.AUTH_RATE_LIMIT ? parseInt(process.env.AUTH_RATE_LIMIT) : 20, // 20 attempts per 15 minutes
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: { message: 'Too many file uploads, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for search
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: { message: 'Too many search requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
