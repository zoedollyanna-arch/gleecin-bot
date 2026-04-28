/**
 * Database Connection
 * PostgreSQL connection pool for Discord bot
 * Uses the same DATABASE_URL as the website
 */

import pg from 'pg';
import 'dotenv/config';
import { initTicketsTable } from './models/ticket.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Execute a database query
 */
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('[DB ERROR]', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database connection
 */
export async function initDatabase() {
  try {
    // Test connection
    await query('SELECT NOW()');
    console.log('✅ [DB] Connected to PostgreSQL');

    // Initialize tables
    await initTicketsTable();

    return true;
  } catch (error) {
    console.error('❌ [DB] Connection failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  await pool.end();
  console.log('🔌 [DB] Connection closed');
}

export default { query, initDatabase, closeDatabase };
