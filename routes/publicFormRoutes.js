const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/formController');
const ApiError = require('../utils/ApiError');
const { validationResult } = require('express-validator');
const { publicFormReadLimiter, publicFormSubmitLimiter } = require('../middleware/rateLimiter');

/** PUBLIC routes (no authentication): the application form opened from its shared link. */
const router = express.Router();

const slugValidator = param('slug')
  .matches(/^[a-z0-9-]{3,120}$/)
  .withMessage('This form is not available.');

function validatePublic(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  next(ApiError.notFound(errors.array()[0].msg));
}

router.get('/:slug', publicFormReadLimiter, slugValidator, validatePublic, controller.publicForm);
router.post('/:slug/responses', publicFormSubmitLimiter, slugValidator, validatePublic, controller.submit);

module.exports = router;
