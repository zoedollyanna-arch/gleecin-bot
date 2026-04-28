/**
 * Database Migration Script for PostgreSQL
 * Creates all required tables and schema for GLEECIN Academy
 * Run once on deployment with: node src/db/migrate.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Migration SQL
 */
const migrations = [
  // Drop existing tables if they exist (for clean migration)
  `DROP TABLE IF EXISTS admin_logs CASCADE`,
  `DROP TABLE IF EXISTS announcements CASCADE`,
  `DROP TABLE IF EXISTS payments CASCADE`,
  `DROP TABLE IF EXISTS certifications CASCADE`,
  `DROP TABLE IF EXISTS challenge_submissions CASCADE`,
  `DROP TABLE IF EXISTS challenges CASCADE`,
  `DROP TABLE IF EXISTS lesson_progress CASCADE`,
  `DROP TABLE IF EXISTS lessons CASCADE`,
  `DROP TABLE IF EXISTS script_downloads CASCADE`,
  `DROP TABLE IF EXISTS scripts CASCADE`,
  `DROP TABLE IF EXISTS enrollments CASCADE`,
  `DROP TABLE IF EXISTS classes CASCADE`,
  `DROP TABLE IF EXISTS users CASCADE`,

  // Users table (extends bot's user data)
  `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      discord_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      avatar_url TEXT,
      roles TEXT[] DEFAULT '{}',
      tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'advanced')),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      is_admin BOOLEAN DEFAULT false
    )
  `,

  // Classes table
  `
    CREATE TABLE classes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
      duration TEXT,
      instructor TEXT,
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      max_students INTEGER,
      current_students INTEGER DEFAULT 0,
      topics TEXT,
      requirements TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Enrollments
  `
    CREATE TABLE enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      UNIQUE(user_id, class_id)
    )
  `,

  // Scripts (Library)
  `
    CREATE TABLE scripts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      language TEXT,
      author_id INTEGER REFERENCES users(id),
      code TEXT,
      explanation TEXT,
      use_cases TEXT,
      common_mistakes TEXT,
      version TEXT,
      tags TEXT[] DEFAULT '{}',
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      download_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      is_public BOOLEAN DEFAULT true,
      file_url TEXT,
      thumbnail_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,

  // Script downloads tracking
  `
    CREATE TABLE script_downloads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Lessons (Video Vault)
  `
    CREATE TABLE lessons (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
      duration TEXT,
      video_url TEXT NOT NULL,
      video_type TEXT CHECK (video_type IN ('youtube', 'vimeo', 'google_drive', 'uploaded')),
      transcript TEXT,
      tags TEXT[] DEFAULT '{}',
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      creator_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Lesson progress tracking
  `
    CREATE TABLE lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT false,
      watch_time_seconds INTEGER DEFAULT 0,
      last_watched_at TIMESTAMP,
      completed_at TIMESTAMP,
      UNIQUE(user_id, lesson_id)
    )
  `,

  // Challenges (Coding Exercises)
  `
    CREATE TABLE challenges (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
      starter_code TEXT,
      solution TEXT,
      test_cases JSONB,
      explanation TEXT,
      level TEXT DEFAULT 'beginner',
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Challenge submissions
  `
    CREATE TABLE challenge_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      submitted_code TEXT,
      status TEXT CHECK (status IN ('submitted', 'passed', 'failed')),
      passed_tests INTEGER,
      total_tests INTEGER,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Certifications & Achievements
  `
    CREATE TABLE certifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_name TEXT NOT NULL,
      completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      certificate_id TEXT UNIQUE,
      pdf_url TEXT,
      badge_url TEXT,
      shared BOOLEAN DEFAULT false,
      shared_at TIMESTAMP
    )
  `,

  // Payment System (CRITICAL - Linden-based)
  `
    CREATE TABLE payments (
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
  `,

  // Admin logs
  `
    CREATE TABLE admin_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_user_id INTEGER REFERENCES users(id),
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Announcements
  `
    CREATE TABLE announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      important BOOLEAN DEFAULT false,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      views INTEGER DEFAULT 0
    )
  `,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category)`,
  `CREATE INDEX IF NOT EXISTS idx_scripts_tier ON scripts(price_tier)`,
  `CREATE INDEX IF NOT EXISTS idx_lessons_tier ON lessons(price_tier)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id)`
];

/**
 * Run migrations
 */
async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migration...\n');

    for (const sql of migrations) {
      try {
        await client.query(sql);
        console.log('✅', sql.split('\n')[0].substring(0, 60) + '...');
      } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
      }
    }

    console.log('\n✨ Database migration complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
runMigrations().catch(console.error).finally(() => process.exit(0));
