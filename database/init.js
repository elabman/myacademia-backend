/**
 * Loads database/schema.sql into MySQL using the credentials in .env.
 * Usage: npm run db:init
 *
 * Note: this connects WITHOUT selecting a database first, because the
 * script itself contains `DROP DATABASE IF EXISTS` / `CREATE DATABASE`.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Running database/schema.sql against MySQL server...');
  await connection.query(sql);
  console.log('Schema applied successfully to db_myacademia.');
  await connection.end();
}

run().catch((err) => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
