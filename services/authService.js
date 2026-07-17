const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, withTransaction } = require('../config/database');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const USER_PUBLIC_COLUMNS = `user_id, full_name, email, role_id, department_id, phone, is_active, last_login_at, created_at, updated_at`;

async function findUserByEmail(email) {
  const rows = await query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query(`SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE user_id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function register({ full_name, email, password, role_id, department_id, phone }) {
  const existing = await findUserByEmail(email);
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const roleRows = await query(`SELECT role_id FROM roles WHERE role_id = ?`, [role_id]);
  if (roleRows.length === 0) throw ApiError.badRequest('Invalid role_id');

  if (department_id) {
    const deptRows = await query(`SELECT department_id FROM departments WHERE department_id = ?`, [department_id]);
    if (deptRows.length === 0) throw ApiError.badRequest('Invalid department_id');
  }

  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, role_id, department_id, phone)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [full_name, email, passwordHash, role_id, department_id || null, phone || null]
  );

  return findUserById(result.insertId);
}

async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.is_active) throw ApiError.forbidden('This account has been deactivated');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw ApiError.unauthorized('Invalid email or password');

  await query(`UPDATE users SET last_login_at = NOW() WHERE user_id = ?`, [user.user_id]);

  const payload = { sub: user.user_id, email: user.email, role_id: user.role_id };
  const { token: accessToken } = signAccessToken(payload);
  const { token: refreshToken } = signRefreshToken(payload);

  const safeUser = await findUserById(user.user_id);
  return { user: safeUser, accessToken, refreshToken };
}

async function refresh(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const blacklisted = await query(`SELECT id FROM token_blacklist WHERE jti = ? LIMIT 1`, [decoded.jti]);
  if (blacklisted.length > 0) throw ApiError.unauthorized('Token has been revoked');

  const user = await findUserById(decoded.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized('User account not available');

  const payload = { sub: user.user_id, email: user.email, role_id: user.role_id };
  const { token: accessToken } = signAccessToken(payload);
  return { accessToken };
}

async function logout({ jti, userId, expiresAt }) {
  await query(
    `INSERT INTO token_blacklist (user_id, jti, expires_at) VALUES (?, ?, ?)`,
    [userId, jti, expiresAt]
  );
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const rows = await query(`SELECT * FROM users WHERE user_id = ?`, [userId]);
  const user = rows[0];
  if (!user) throw ApiError.notFound('User not found');

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) throw ApiError.unauthorized('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await query(`UPDATE users SET password_hash = ? WHERE user_id = ?`, [newHash, userId]);
}

async function forgotPassword(email) {
  const user = await findUserByEmail(email);
  // Always respond the same way whether or not the user exists (avoid
  // leaking which emails are registered) - caller returns a generic message.
  if (!user) return null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.resetTokenExpiresMin * 60 * 1000);

  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user.user_id, tokenHash, expiresAt]
  );

  // In production this raw token would be emailed to the user, never
  // returned in the API response. Returned here only so the reset flow
  // is testable end-to-end without an email provider configured.
  return rawToken;
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const rows = await query(
    `SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW() LIMIT 1`,
    [tokenHash]
  );
  const resetRecord = rows[0];
  if (!resetRecord) throw ApiError.badRequest('Reset token is invalid or has expired');

  await withTransaction(async (trx) => {
    const newHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
    await trx.query(`UPDATE users SET password_hash = ? WHERE user_id = ?`, [newHash, resetRecord.user_id]);
    await trx.query(`UPDATE password_resets SET used = 1 WHERE reset_id = ?`, [resetRecord.reset_id]);
  });
}

async function updateProfile(userId, { full_name, phone }) {
  const fields = [];
  const params = [];
  if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (fields.length === 0) throw ApiError.badRequest('No valid fields provided');
  params.push(userId);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, params);
  return findUserById(userId);
}

module.exports = {
  findUserByEmail,
  findUserById,
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
};
