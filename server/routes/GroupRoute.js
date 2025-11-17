import express from 'express';
import {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  inviteToGroup,
  removeMember,
  makeMemberAdmin,
  addMember,
} from '../controllers/GroupController.js';
import {
  createGroupPost,
  getGroupPosts,
} from '../controllers/GroupPostController.js';
import {
  getOrCreateGroupChat,
  addGroupMessage,
  getGroupMessages,
} from '../controllers/GroupChatController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// Log route registration for debugging
// console.log('GroupRoute: Registering routes...');

// Base routes
router.post('/', authMiddleWare, createGroup);
router.get('/', getGroups);

// Specific routes - MUST come before general /:id route to avoid conflicts
// Member management routes
router.post('/:id/members', authMiddleWare, validateId, addMember);
router.delete('/:id/members', authMiddleWare, validateId, removeMember);
router.put('/:id/members/admin', authMiddleWare, validateId, makeMemberAdmin);

// Group chat routes - order matters! More specific routes first
router.get('/:id/chat/messages', authMiddleWare, validateId, getGroupMessages);
router.post('/:id/chat/messages', authMiddleWare, validateId, (req, res, next) => {
  // console.log('POST /:id/chat/messages route matched', req.params.id);
  next();
}, addGroupMessage);
router.get('/:id/chat', authMiddleWare, validateId, getOrCreateGroupChat);

// Group events routes - stub routes (to be implemented)
router.get('/:id/events', authMiddleWare, validateId, (req, res) => {
  // Debug logging
  // console.log('Events route hit:', req.params.id, req.query);
  // Return empty array directly to match frontend expectations
  res.status(200).json([]);
});
router.post('/:id/events', authMiddleWare, validateId, (req, res) => {
  res.status(501).json({ message: "Events feature not yet implemented" });
});
router.put('/:id/events/:eventId/rsvp', authMiddleWare, validateId, (req, res) => {
  res.status(501).json({ message: "Events feature not yet implemented" });
});

// Group posts routes
router.post('/:id/posts', authMiddleWare, validateId, createGroupPost);
router.get('/:id/posts', validateId, getGroupPosts);

// General group routes - must come LAST
router.get('/:id', validateId, getGroup);
router.put('/:id', authMiddleWare, validateId, updateGroup);
router.delete('/:id', authMiddleWare, validateId, deleteGroup);
router.put('/:id/join', authMiddleWare, validateId, joinGroup);
router.put('/:id/leave', authMiddleWare, validateId, leaveGroup);
router.post('/:id/invite', authMiddleWare, validateId, inviteToGroup);

// Log successful route registration
// console.log('GroupRoute: Routes registered successfully');

export default router;

