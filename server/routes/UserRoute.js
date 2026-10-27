import express from 'express';
import { 
  deleteUser, 
  followUser, 
  getAllUsers, 
  getUser, 
  unfollowUser, 
  updateUser,
  blockUser,
  unblockUser,
  savePost,
  getSavedPosts,
  changePassword,
  setupMfa,
  enableMfa,
  disableMfa
} from '../controllers/UserController.js';
import authMiddleWare from '../middleware/AuthMiddleware.js';
import { validateId, validateUserUpdate, validateChangePassword } from '../middleware/validation.js';

const router = express.Router();

// More specific routes first
router.get('/:id/saved', authMiddleWare, validateId, getSavedPosts);
router.put('/:id/follow', authMiddleWare, validateId, followUser);
router.put('/:id/unfollow', authMiddleWare, validateId, unfollowUser);
router.put('/:id/block', authMiddleWare, validateId, blockUser);
router.put('/:id/unblock', authMiddleWare, validateId, unblockUser);

// Password & MFA management routes
router.put('/:id/password', authMiddleWare, validateId, validateChangePassword, changePassword);
router.post('/:id/mfa/setup', authMiddleWare, validateId, setupMfa);
router.post('/:id/mfa/enable', authMiddleWare, validateId, enableMfa);
router.post('/:id/mfa/disable', authMiddleWare, validateId, disableMfa);

// Generic routes
router.get('/:id', validateId, getUser);
router.get('/', getAllUsers);
router.put('/:id', authMiddleWare, validateId, validateUserUpdate, updateUser);
router.delete('/:id', authMiddleWare, validateId, deleteUser);

export default router;
