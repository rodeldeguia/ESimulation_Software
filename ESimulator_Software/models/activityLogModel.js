// models/activityLogModel.js
const pool = require('../config/db');

module.exports = {

  // ─── Log one activity ───
  // Required: actor_type, actor_id, action, entity_type
  // Optional: entity_id, details, ip_address, user_agent
  async log({ actor_type, actor_id, action, entity_type, entity_id, details, ip_address, user_agent }) {
    // Guard: never insert NULLs into NOT NULL columns
    if (!actor_type || !actor_id || !action || !entity_type) {
      console.warn('activityLog.log skipped — missing required fields');
      return;
    }

    try {
      await pool.query(
        `INSERT INTO activity_logs
         (actor_type, actor_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actor_type,
          actor_id,
          action,
          entity_type,
          entity_id ?? null,
          details ? JSON.stringify(details) : null,
          ip_address ?? null,
          user_agent ?? null
        ]
      );
    } catch (err) {
      // Never crash the caller because logging failed
      console.error('activityLog.log error:', err.message);
    }
  },

  // ─── Get recent logs with pagination ───
  async getRecent({ limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT * FROM activity_logs
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  },

  // ─── Count logs by action (for admin dashboard widgets) ───
  async countByAction() {
    const [rows] = await pool.query(
      `SELECT action, COUNT(*) AS cnt
       FROM activity_logs
       GROUP BY action
       ORDER BY cnt DESC`
    );
    return rows.map(r => ({ action: r.action, count: Number(r.cnt) }));
  }

};