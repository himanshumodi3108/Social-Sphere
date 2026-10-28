import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure storage with automatic directory creation and secure basename sanitization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure upload directory points to server/public/images regardless of invocation working directory
    const serverImagesDir = path.join(__dirname, '..', 'public', 'images');
    const uploadDir = fs.existsSync(path.join(__dirname, '..', 'public')) 
      ? serverImagesDir 
      : path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // If the frontend passed a target filename (e.g. from ProfileModal or PostShare), sanitize it
    let targetName = req.body?.name || file.originalname || 'upload';
    // Strip all path traversal characters (no ../ or path slashes)
    const safeName = path.basename(targetName).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

// File filter supporting all standard image and video types, blocking dangerous scripts
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.php', '.phtml', '.js', '.mjs', '.html', '.htm', '.svg'];

  if (dangerousExts.includes(ext)) {
    return cb(new Error('Executable and script file types are not allowed.'), false);
  }

  // Allow all standard image and video types
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }

  // Common extensions fallback
  const commonMediaExts = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif', '.heic', '.heif', '.avif',
    '.mp4', '.mov', '.webm', '.mkv', '.avi'
  ];
  if (commonMediaExts.includes(ext)) {
    return cb(null, true);
  }

  cb(new Error(`Invalid file type (${file.mimetype}). Only images and videos are supported.`), false);
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit (accommodates high-res phone photos and video clips)
  },
  fileFilter: fileFilter
});

// Safe upload handler with explicit multer error catching and logging
const handleSingleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      logger.warn("Upload rejected by handler", { error: err.message, code: err.code });
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File size exceeds 30MB limit" });
        }
        return res.status(400).json({ message: "Upload error: " + err.message });
      }
      return res.status(400).json({ message: err.message || "Invalid file upload" });
    }
    next();
  });
};

router.post("/", uploadLimiter, authMiddleWare, handleSingleUpload, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded or invalid file type" });
    }

    logger.info('File uploaded successfully', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      userId: req.userId
    });

    return res.status(200).json({ 
      message: "File uploaded successfully",
      filename: req.file.filename,
      path: `/images/${req.file.filename}`,
      name: req.file.filename
    });
  } catch (error) {
    logger.error('File upload error', { error: error.message, userId: req.userId });
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

export default router;

