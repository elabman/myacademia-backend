/**
 * Loads database/schema.sql into MySQL using the credentials in .env.
 * Usage: npm run db:init            (only for a NEW, empty server)
 *        node database/init.js --force   (deliberately wipe and rebuild: see db:rebuild)
 *
 * schema.sql starts with `DROP DATABASE IF EXISTS db_myacademia`, which deletes every
 * table and row. So this script refuses to run when that database already contains the
 * app's tables, unless --force is given; and in production it also needs ALLOW_DB_DROP=yes.
 * To update an existing database without losing data use:  npm run db:migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DATABASE_IN_SCHEMA = 'db_myacademia'; // the name hard-coded in schema.sql

async function run() {
  const force = process.argv.includes('--force');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const [existing] = await connection.query(
    `SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ?`,
    [DATABASE_IN_SCHEMA]
  );

  if (existing[0].tables > 0) {
    if (!force) {
      console.error(
        `STOPPED: database ${DATABASE_IN_SCHEMA} already exists with ${existing[0].tables} tables.\n` +
          'db:init would DELETE all of its data. Nothing was changed.\n' +
          'To update it safely (keeping the data) run:  npm run db:migrate\n' +
          'If you really want to wipe and rebuild it (local use only), back it up and run:  npm run db:rebuild'
      );
      await connection.end();
      process.exit(1);
    }

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_DROP !== 'yes') {
      console.error(
        'STOPPED: NODE_ENV is production, so the database will not be dropped even with --force.\n' +
          'Nothing was changed. (Only if you are certain: set ALLOW_DB_DROP=yes for this one command.)'
      );
      await connection.end();
      process.exit(1);
    }
  }

  console.log('Running database/schema.sql against MySQL server...');
  await connection.query(sql);
  console.log('Schema applied successfully to db_myacademia.');
  await connection.end();
}

run().catch((err) => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
