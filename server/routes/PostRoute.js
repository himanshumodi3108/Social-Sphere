import express from 'express';
import { createPost, deletePost, getPost, getTimelinePosts, likePost, updatePost, addComment, likeComment } from '../controllers/PostController.js';
import { savePost } from '../controllers/UserController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validatePost, validateComment, validateId } from '../middleware/validation.js';

const router = express.Router();

router.post('/', authMiddleWare, validatePost, createPost);
// More specific routes must come before generic :id routes
router.get('/:id/timeline', validateId, getTimelinePosts);
router.put('/:id/like', authMiddleWare, validateId, likePost);
router.put('/:id/save', authMiddleWare, validateId, savePost);
router.post('/:id/comment', authMiddleWare, validateId, validateComment, addComment);
router.put('/:id/comment/:commentId/like', authMiddleWare, validateId, likeComment);
// Generic routes come last
router.get('/:id', validateId, getPost);
router.put('/:id', authMiddleWare, validateId, updatePost);
router.delete('/:id', authMiddleWare, validateId, deletePost);

export default router;