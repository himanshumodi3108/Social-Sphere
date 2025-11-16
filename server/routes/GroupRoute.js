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
} from '../controllers/GroupController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

router.post('/', authMiddleWare, createGroup);
router.get('/', getGroups);
router.get('/:id', validateId, getGroup);
router.put('/:id', authMiddleWare, validateId, updateGroup);
router.delete('/:id', authMiddleWare, validateId, deleteGroup);
router.put('/:id/join', authMiddleWare, validateId, joinGroup);
router.put('/:id/leave', authMiddleWare, validateId, leaveGroup);
router.post('/:id/invite', authMiddleWare, validateId, inviteToGroup);

export default router;

