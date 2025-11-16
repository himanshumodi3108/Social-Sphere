import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from '../controllers/NotificationController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// Specific routes must come before parameterized routes
router.get('/unread/count', authMiddleWare, getUnreadCount);
router.put('/read/all', authMiddleWare, markAllAsRead);
router.get('/', authMiddleWare, getNotifications);
router.put('/:id/read', authMiddleWare, validateId, markAsRead);
router.get('/:id', authMiddleWare, validateId, getNotifications);
router.delete('/:id', authMiddleWare, validateId, deleteNotification);

export default router;

