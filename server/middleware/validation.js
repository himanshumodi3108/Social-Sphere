import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { errors: errors.array(), path: req.path });
    return res.status(400).json({ 
      message: errors.array()[0]?.msg || 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Auth validation
export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstname')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastname')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/)
    .withMessage('Please provide a valid phone number (minimum 7 digits)'),
  body().custom((value, { req }) => {
    const email = req.body.email && String(req.body.email).trim();
    const phone = req.body.phone && String(req.body.phone).trim();
    if (!email && !phone) {
      throw new Error('Please provide at least one contact method: Email or Phone Number');
    }
    return true;
  }),
  handleValidationErrors
];

export const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

export const validateVerifyMfa = [
  body('tempUserId')
    .notEmpty()
    .withMessage('Temporary user ID is required'),
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('A 6-digit verification code is required'),
  handleValidationErrors
];

export const validateForgotPassword = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  handleValidationErrors
];

export const validateResetPassword = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('A 6-digit reset code is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// Post validation
export const validatePost = [
  body('desc')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Post description must be less than 2000 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  handleValidationErrors
];

// Comment validation
export const validateComment = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  handleValidationErrors
];

// User update validation
export const validateUserUpdate = [
  body('firstname')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastname')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('query')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID parameter validation - flexible to handle both ObjectId and string IDs
export const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required')
    .custom((value) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('ID must be a non-empty string');
      }
      return true;
    }),
  handleValidationErrors
];
