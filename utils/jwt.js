const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

function signAccessToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
  });
  return { token, jti };
}

function signRefreshToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: config.jwt.issuer,
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, { issuer: config.jwt.issuer });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
