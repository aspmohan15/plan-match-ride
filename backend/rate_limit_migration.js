import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:123@localhost:5432/ride_match'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_events (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limit_events(identifier, action, created_at);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_phone_change_at TIMESTAMP;
    `);
    console.log("Migration applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit();
}

run();