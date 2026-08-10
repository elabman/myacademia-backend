/**
 * Loads database/mou_schema.sql into the EXISTING db_myacademia
 * database using the credentials in .env.
 * Usage: npm run db:init-mou
 *
 * Unlike database/init.js (which creates the database from scratch),
 * this script connects directly to db_myacademia, since mou_schema.sql
 * only adds new tables/views to an already-created database.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'mou_schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_myacademia',
    multipleStatements: true,
  });

  console.log('Running database/mou_schema.sql against db_myacademia...');
  await connection.query(sql);
  console.log('MoU tables added successfully to db_myacademia.');
  await connection.end();
}

run().catch((err) => {
  console.error('Failed to apply MoU schema:', err.message);
  process.exit(1);
});
