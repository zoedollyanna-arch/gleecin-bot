import { run } from './database.js';

async function migrateSessions() {
  try {
    // Create sessions table
    await run(`
CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        admin_id INTEGER REFERENCES users(id),
        topic TEXT NOT NULL,
        preferred_time TIMESTAMP,
        duration INTEGER, -- minutes
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
    
    console.log('✅ Sessions table ready');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateSessions();

