import express from 'express';
import {
  createStory,
  getUserStories,
  getTimelineStories,
  viewStory,
  reactToStory,
  deleteStory,
} from '../controllers/StoryController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

router.post('/', authMiddleWare, createStory);
router.get('/timeline', authMiddleWare, getTimelineStories);
// Specific routes must come before parameterized routes
router.put('/:id/view', authMiddleWare, validateId, viewStory);
router.put('/:id/react', authMiddleWare, validateId, reactToStory);
router.get('/:id', validateId, getUserStories);
router.delete('/:id', authMiddleWare, validateId, deleteStory);

export default router;

