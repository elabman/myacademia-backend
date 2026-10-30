/**
 * Loads database/review_schema.sql into the EXISTING database using
 * the credentials in .env.
 * Usage: npm run db:init-reviews
 *
 * Safe to run more than once (the schema uses CREATE TABLE IF NOT EXISTS).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'review_schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_myacademia',
    multipleStatements: true,
  });

  console.log('Running database/review_schema.sql...');
  await connection.query(sql);
  console.log('Review tables (services, service_departments, reviews) are ready.');
  await connection.end();
}

run().catch((err) => {
  console.error('Failed to apply review schema:', err.message);
  process.exit(1);
});
