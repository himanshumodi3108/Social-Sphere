import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const safeExt = allowedExts.includes(ext) ? ext : '.jpg';
    
    // Generate secure unique identifier
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize the base name: strictly alphanumeric, dash, and underscore (no path traversal)
    const baseName = path.basename(file.originalname || 'upload', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);
      
    cb(null, `${uniqueSuffix}-${baseName || 'upload'}${safeExt}`);
  },
});

// File filter for strict image validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Safe upload handler with explicit multer error catching
const handleSingleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File size exceeds 5MB limit" });
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
      path: `/images/${req.file.filename}`
    });
  } catch (error) {
    logger.error('File upload error', { error: error.message, userId: req.userId });
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

export default router;

