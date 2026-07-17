const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Verifies the Bearer JWT, rejects blacklisted (logged-out) tokens,
 * and attaches { id, email, roleId, jti, exp } to req.user.
 */
const authenticate = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const blacklisted = await query(`SELECT id FROM token_blacklist WHERE jti = ? LIMIT 1`, [decoded.jti]);
  if (blacklisted.length > 0) {
    throw ApiError.unauthorized('Token has been revoked, please log in again');
  }

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    roleId: decoded.role_id,
    jti: decoded.jti,
    exp: decoded.exp,
  };
  next();
});

/**
 * Restricts a route to a whitelist of role_ids.
 * Usage: authorize([1, 6]) -> only Principal (1) and Administrator (6)
 */
const authorize = (...allowedRoleIds) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (allowedRoleIds.length && !allowedRoleIds.includes(req.user.roleId)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

module.exports = { authenticate, authorize };
