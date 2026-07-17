const { query } = require('../config/database');

/**
 * Writes one row to audit_log. Called internally by controllers after
 * a successful write on an audited table. Never exposed as a public
 * write endpoint - audit_log is read-only via the API (see routes).
 */
async function record({ userId = null, tableName, recordId, action, oldValues = null, newValues = null }) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, table_name, record_id, action, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tableName,
        recordId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ]
    );
  } catch (err) {
    // Audit logging must never break the main request flow.
    // eslint-disable-next-line no-console
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { record };
