/**
 * Loads database/forms_schema.sql into the EXISTING database (credentials from .env) and
 * makes sure the forms table is linked to short courses (needed on databases that got the
 * forms tables before that link existed).
 * Usage: npm run db:init-forms     (safe to run more than once)
 *
 * Forms are created from the short course screen; the ready-made default form
 * ("Graphic Design for Packaging...") is a template offered there, not a stored row.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function ensureShortCourseLink(connection) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forms' AND COLUMN_NAME = 'short_course_id'`
  );
  if (columns.length > 0) return false;

  await connection.query(`
    ALTER TABLE forms
      ADD COLUMN short_course_id INT UNSIGNED NULL AFTER form_id,
      ADD UNIQUE KEY uq_form_short_course (short_course_id),
      ADD CONSTRAINT fk_form_short_course FOREIGN KEY (short_course_id)
        REFERENCES short_courses(course_id) ON UPDATE CASCADE ON DELETE RESTRICT`);
  return true;
}

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'forms_schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_myacademia',
    multipleStatements: true,
  });

  console.log('Running database/forms_schema.sql...');
  await connection.query(sql);
  console.log('Form tables are ready.');

  if (await ensureShortCourseLink(connection)) {
    console.log('Linked forms to short courses (added forms.short_course_id).');
  }

  await connection.end();
}

run().catch((err) => {
  console.error('Failed to apply forms schema:', err.message);
  process.exit(1);
});
