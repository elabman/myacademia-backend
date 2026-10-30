const express = require('express');
const { body, param, validationResult } = require('express-validator');
const controller = require('../controllers/reviewController');
const ApiError = require('../utils/ApiError');
const {
  publicReviewReadLimiter,
  publicReviewHourlyLimiter,
  publicReviewCooldownLimiter,
} = require('../middleware/rateLimiter');

/**
 * PUBLIC routes (no authentication) used by the mobile review page that
 * opens when a staff member's Data Matrix code is scanned.
 */
const router = express.Router();

// Visitors see the first problem as plain text, so surface it as the message.
function validatePublic(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.unprocessable(details[0].message, details));
}

router.get(
  '/staff/:staffId',
  publicReviewReadLimiter,
  param('staffId').isInt({ min: 1 }).withMessage('This review link is not valid.').toInt(),
  validatePublic,
  controller.getTarget
);

router.post(
  '/',
  publicReviewHourlyLimiter,
  publicReviewCooldownLimiter,
  body('staff_id').isInt({ min: 1 }).withMessage('This review link is not valid.').toInt(),
  body('service_id').isInt({ min: 1 }).withMessage('Please choose a service.').toInt(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Please choose a rating from 1 to 5.').toInt(),
  body('comment')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('The comment can be at most 1000 characters.'),
  body('reviewer_name')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('The name can be at most 100 characters.'),
  validatePublic,
  controller.submit
);

module.exports = router;
