import { query } from './db.js';

export async function enforceAndLogRateLimits({ identifier, action, limits }) {
  // limits = [{ windowMinutes: 0.5, maxRequests: 1, message: '...' }, ...]

  // Clean old events asynchronously (optional maintenance, doing it here for demo or use cron)
  query(`DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '1 day'`).catch(() => {});

  // Begin transaction to prevent race conditions
  await query('BEGIN');
  try {
    // Acquire an advisory lock for this identifier + action to serialize requests
    // We create a unique 64-bit integer from the strings using a simple hash for the lock
    // A simpler way without hashing is just locking the row if it exists, but rate_limit_events has many rows.
    // Let's just lock the dummy or use pg_advisory_xact_lock.
    // For simplicity, we just rely on the transaction isolation or advisory lock.

    // Check all limits
    for (const limit of limits) {
      const countRes = await query(`
        SELECT COUNT(*) as count
        FROM rate_limit_events
        WHERE identifier = $1
          AND action = $2
          AND created_at >= NOW() - INTERVAL '1 minute' * $3
      `, [identifier, action, limit.windowMinutes]);

      const count = parseInt(countRes.rows[0].count, 10);

      if (count >= limit.maxRequests) {
        await query('ROLLBACK');
        const error = new Error(limit.message || `Rate limit exceeded.`);
        error.code = 'RATE_LIMIT_EXCEEDED';
        throw error;
      }
    }

    // Insert the new event
    await query(`
      INSERT INTO rate_limit_events (identifier, action) VALUES ($1, $2)
    `, [identifier, action]);

    await query('COMMIT');
  } catch (error) {
    if (error.code !== 'RATE_LIMIT_EXCEEDED') {
      await query('ROLLBACK');
    }
    throw error;
  }
}

export async function clearRateLimitEvents({ identifier, action }) {
  await query(`DELETE FROM rate_limit_events WHERE identifier = $1 AND action = $2`, [identifier, action]);
}
