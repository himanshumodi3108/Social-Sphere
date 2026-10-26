import express from 'express';
import { addMessage, getMessages } from '../controllers/MessageController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';

const router = express.Router();

router.post('/', authMiddleWare, addMessage);
router.get('/:chatId', authMiddleWare, getMessages);

export default router;
