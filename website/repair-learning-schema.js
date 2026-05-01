import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const statements = [
  `CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    passing_score INTEGER DEFAULT 70,
    time_limit_minutes INTEGER,
    price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'code', 'fill_blank', 'debug', 'prediction', 'challenge')),
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    certificate_url TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_id TEXT UNIQUE,
    is_custom BOOLEAN DEFAULT false
  )`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)`
];

async function main() {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log(`OK: ${sql.split('\n')[0]}`);
    }
    console.log('Learning schema repair complete');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Learning schema repair failed:', error);
  process.exit(1);
});
