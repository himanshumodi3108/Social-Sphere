import express from 'express';
import { search } from '../controllers/SearchController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateSearch } from '../middleware/validation.js';
import { searchLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', searchLimiter, authMiddleWare, validateSearch, search);

export default router;

