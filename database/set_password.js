/**
 * Sets a real password for an existing user. The sample users in schema.sql carry a
 * placeholder hash, so nobody can log in until a password is set here.
 *
 *   npm run user:set-password -- admin@rp.ac.rw 'NewPassw0rd'
 *
 * Rules match the API: at least 8 characters and at least one number.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, query } = require('../config/database');
const config = require('../config/config');

async function run() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npm run user:set-password -- <email> '<new password>'");
    process.exit(1);
  }
  if (password.length < 8 || !/\d/.test(password)) {
    console.error('The password must be at least 8 characters and contain a number.');
    process.exit(1);
  }

  const users = await query('SELECT user_id, is_active FROM users WHERE email = ? LIMIT 1', [email]);
  if (!users[0]) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, users[0].user_id]);
  console.log(`Password updated for ${email}${users[0].is_active ? '' : ' (note: this account is inactive)'}.`);
}

run()
  .catch((error) => {
    console.error('Failed to set the password:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
