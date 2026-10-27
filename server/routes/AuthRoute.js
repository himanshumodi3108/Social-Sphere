import express from 'express';
import {
  loginUser,
  registerUser,
  verifyLoginMfa,
  forgotPassword,
  resetPassword,
} from '../controllers/AuthController.js';
import {
  validateRegister,
  validateLogin,
  validateVerifyMfa,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, registerUser);
router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/verify-mfa', authLimiter, validateVerifyMfa, verifyLoginMfa);
router.post('/forgot-password', authLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, resetPassword);

export default router;
