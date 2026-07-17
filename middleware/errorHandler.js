const ApiError = require('../utils/ApiError');
const config = require('../config/config');

/** 404 handler for unmatched routes */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Maps known MySQL / library errors to clean HTTP responses */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // mysql2 errors
  if (err.code === 'ER_DUP_ENTRY') {
    return ApiError.conflict('Duplicate entry: this record already exists');
  }
  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return ApiError.badRequest('Invalid reference: related record does not exist');
  }
  if (err.code === 'ER_ROW_IS_REFERENCED' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return ApiError.conflict('Cannot delete: this record is referenced by other records');
  }
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return ApiError.badRequest('Invalid field in request');
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return ApiError.unprocessable('A database constraint was violated: ' + err.sqlMessage);
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired token');
  }

  return ApiError.internal(config.env === 'production' ? 'Internal server error' : err.message);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);

  if (config.env !== 'production' && apiError.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const body = {
    success: false,
    message: apiError.message,
  };
  if (apiError.details) body.errors = apiError.details;
  if (config.env !== 'production' && apiError.statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(apiError.statusCode || 500).json(body);
}

module.exports = { notFound, errorHandler };
