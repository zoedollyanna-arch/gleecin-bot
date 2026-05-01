/**
 * Database Initialization
 * Connects to PostgreSQL database (same as bot) for user data, classes, scripts, etc.
 */

import pg from 'pg';
const { Pool } = pg;

// Create PostgreSQL connection pool using the same DATABASE_URL as the bot
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Query function for PostgreSQL
 */
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Initialize database connection and ensure tables exist
 */
export async function initializeDatabase() {
  try {
    // Test connection
    await query('SELECT 1');
    console.log('[DB] ✅ Connected to PostgreSQL');

    // Ensure tables required by the website routes exist even if the
    // deployment skipped the full migration script.
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier TEXT NOT NULL CHECK (tier IN ('paid', 'advanced')),
        amount_lindens INTEGER NOT NULL,
        recipient TEXT DEFAULT 'zoedollyanna resident',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
        proof_text TEXT,
        transaction_date TIMESTAMP,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        notes TEXT
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        is_reply BOOLEAN DEFAULT false,
        parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read)`);

  } catch (error) {
    console.error('[DB] Connection error:', error);
    throw error;
  }
}

/**
 * Get database instance (for compatibility with existing code)
 */
export function getDatabase() {
  return {
    run: async (sql, params) => {
      return await query(sql, params);
    },
    get: async (sql, params) => {
      const result = await query(sql, params);
      return result.rows[0] || null;
    },
    all: async (sql, params) => {
      const result = await query(sql, params);
      return result.rows;
    }
  };
}

/**
 * Run a query (for INSERT, UPDATE, DELETE)
 */
export async function run(sql, params = []) {
  const result = await query(sql, params);
  return { id: result.rows[0]?.id || null, changes: result.rowCount };
}

/**
 * Get a single row
 */
export async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Get all rows
 */
export async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  await pool.end();
}
