/**
 * MySQL2 promise-based connection pool.
 * Single shared pool used by every model/repository in the app.
 */
const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  dateStrings: true,
  namedPlaceholders: true,
});

/**
 * Simple helper used everywhere: runs a parameterized query and
 * returns just the rows (or result header for INSERT/UPDATE/DELETE).
 * Always uses parameterized queries -> prevents SQL injection.
 */
async function query(sql, params = []) {
  //console.log(sql);
  //console.log(params);
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Run several statements inside one transaction. `fn` receives a
 * connection object with the same `.query(sql, params)` signature.
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const helper = {
      query: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows;
      },
    };
    const result = await fn(helper);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, query, withTransaction, testConnection };
