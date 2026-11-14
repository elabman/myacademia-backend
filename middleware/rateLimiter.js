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

/**
 * Public review endpoints. Visitors in one office usually share a single
 * IP, so the hourly cap is generous; the cooldown stops repeat
 * submissions about the same staff member from the same network.
 */
const publicReviewReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

const publicReviewHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: { success: false, message: 'Too many reviews from this network. Please try again later.' },
});

const publicReviewCooldownLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // a rejected/invalid submission does not start the cooldown
  keyGenerator: (req) => `${req.ip}:${req.body && req.body.staff_id}`,
  message: {
    success: false,
    message: 'You just sent a review for this person. Please wait a minute before sending another.',
  },
});

// Public application forms: loading a form is cheap; submissions are capped per network
// (applicants may share an office or phone network, so the cap is generous).
const publicFormReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

const publicFormSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // invalid or duplicate submissions do not count
  message: { success: false, message: 'Too many applications from this network. Please try again later.' },
});

module.exports = {
  publicFormReadLimiter,
  publicFormSubmitLimiter,
  authRateLimiter,
  publicReviewReadLimiter,
  publicReviewHourlyLimiter,
  publicReviewCooldownLimiter,
};
