/**
 * Central configuration loader.
 * Reads process.env (populated by dotenv in server.js) and exposes
 * a single, typed config object used throughout the app.
 */
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || '*',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_myacademia',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'db-myacademia-api',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  resetTokenExpiresMin: parseInt(process.env.RESET_TOKEN_EXPIRES_MIN, 10) || 30,

  rateLimit: {
    windowMin: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MIN, 10) || 15,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 5,
  },
};

module.exports = config;
