const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after an array of express-validator chains. Collects any
 * validation failures into a single 422 response with a per-field
 * breakdown so clients get meaningful, actionable errors.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
    value: e.value,
  }));

  next(ApiError.unprocessable('Validation failed', details));
}

module.exports = validate;
