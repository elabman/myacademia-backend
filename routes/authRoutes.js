const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  registerValidators,
  loginValidators,
  changePasswordValidators,
  refreshValidators,
  updateProfileValidators,
} = require('./validators/authValidators');

const router = express.Router();

// Public
router.post('/register', authRateLimiter, registerValidators, validate, authController.register);
router.post('/login', authRateLimiter, loginValidators, validate, authController.login);
router.post('/refresh-token', authRateLimiter, refreshValidators, validate, authController.refreshToken);

// Authenticated
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, updateProfileValidators, validate, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidators, validate, authController.changePassword);

module.exports = router;
