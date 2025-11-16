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
    // Sanitize filename and add timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = (req.body.name || file.originalname)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
    cb(null, uniqueSuffix + '-' + name);
  },
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Allowed image MIME types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
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

router.post("/", uploadLimiter, authMiddleWare, upload.single("file"), (req, res) => {
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
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File size exceeds 5MB limit" });
      }
      return res.status(400).json({ message: "File upload error: " + error.message });
    }
    
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

export default router;

