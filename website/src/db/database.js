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
    
    // The tables are already created by the bot's migration script
    // No need to recreate them here since they share the same database
    
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
