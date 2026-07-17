const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * Applied only to sensitive auth endpoints (login, register, forgot
 * password, reset password) to slow down brute-force / credential
 * stuffing attempts.
 */
const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMin * 60 * 1000,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

module.exports = { authRateLimiter };
