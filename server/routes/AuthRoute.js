import express from 'express';
import { loginUser, registerUser } from '../controllers/AuthController.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, registerUser);
router.post('/login', authLimiter, validateLogin, loginUser);

export default router;