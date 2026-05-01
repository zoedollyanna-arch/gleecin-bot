import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run(sql) {
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

async function main() {
  const statements = [
    `
    CREATE TABLE IF NOT EXISTS users (
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
    `
    CREATE TABLE IF NOT EXISTS classes (
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
    `
    CREATE TABLE IF NOT EXISTS certifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_name TEXT NOT NULL,
      certificate_url TEXT,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      certificate_id TEXT UNIQUE,
      is_custom BOOLEAN DEFAULT false
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_name TEXT NOT NULL,
      certificate_url TEXT,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      certificate_id TEXT UNIQUE,
      is_custom BOOLEAN DEFAULT false
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS scripts (
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS script_downloads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
      UNIQUE(user_id, class_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
      duration TEXT,
      video_url TEXT NOT NULL,
      video_type TEXT CHECK (video_type IN ('youtube', 'vimeo', 'google_drive', 'uploaded')),
      video_path TEXT,
      video_mime_type TEXT,
      video_size_bytes BIGINT,
      transcript TEXT,
      tags TEXT[] DEFAULT '{}',
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      creator_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT false,
      watch_time_seconds INTEGER DEFAULT 0,
      progress_percent INTEGER DEFAULT 0,
      last_watched_at TIMESTAMP,
      completed_at TIMESTAMP,
      UNIQUE(user_id, lesson_id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS schedules (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      instructor TEXT,
      scheduled_date DATE,
      scheduled_time TEXT,
      capacity INTEGER,
      description TEXT,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      published BOOLEAN DEFAULT false,
      published_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS challenges (
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
    `
    CREATE TABLE IF NOT EXISTS challenge_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      submitted_code TEXT,
      status TEXT CHECK (status IN ('submitted', 'passed', 'failed')),
      passed_tests INTEGER,
      total_tests INTEGER,
      score INTEGER DEFAULT 0,
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMP,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quizzes (
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
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'code')),
      options JSONB,
      correct_answer TEXT,
      explanation TEXT,
      points INTEGER DEFAULT 1,
      order_index INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      score INTEGER,
      passed BOOLEAN DEFAULT false,
      answers JSONB,
      time_spent_seconds INTEGER,
      attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      content TEXT,
      is_public BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK (type IN ('exercise', 'project', 'mini_challenge')),
      difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
      starter_code TEXT,
      starter_explanation TEXT,
      solution_code TEXT,
      test_cases JSONB,
      resources TEXT[],
      hints TEXT[],
      price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'paid', 'advanced')),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS activity_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      submitted_code TEXT,
      status TEXT CHECK (status IN ('draft', 'submitted', 'passed', 'failed', 'needs_review')),
      test_results JSONB,
      feedback TEXT,
      mentor_id INTEGER REFERENCES users(id),
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP
    )
    `,
    `
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
    `,
    `
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
    `,
    `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      topic TEXT NOT NULL,
      preferred_time TIMESTAMP,
      duration TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'scheduled', 'cancelled')),
      admin_notes TEXT,
      requested_date TIMESTAMP,
      approved_by INTEGER REFERENCES users(id),
      scheduled_at TIMESTAMP,
      completed_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS session_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
      requested_date TIMESTAMP,
      approved_by INTEGER REFERENCES users(id),
      scheduled_at TIMESTAMP,
      completed_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS admin_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_user_id INTEGER REFERENCES users(id),
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      important BOOLEAN DEFAULT false,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`,
    `CREATE INDEX IF NOT EXISTS idx_scripts_title_unique ON scripts (LOWER(title))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_scripts_content_unique ON scripts (LOWER(COALESCE(description, '')), LOWER(COALESCE(code, '')), LOWER(COALESCE(explanation, '')), LOWER(COALESCE(use_cases, '')), LOWER(COALESCE(common_mistakes, '')))`,
    `CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category)`,
    `CREATE INDEX IF NOT EXISTS idx_scripts_tier ON scripts(price_tier)`,
    `CREATE INDEX IF NOT EXISTS idx_lessons_tier ON lessons(price_tier)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
    `CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_session_requests_user ON session_requests(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_id)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_title_unique ON challenges (LOWER(title))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_content_unique ON challenges (LOWER(COALESCE(description, '')), LOWER(COALESCE(starter_code, '')), LOWER(COALESCE(solution, '')), LOWER(COALESCE(explanation, '')))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_title_unique ON quizzes (LOWER(title))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_content_unique ON quizzes (LOWER(COALESCE(description, '')), COALESCE(lesson_id, 0), COALESCE(difficulty, ''), COALESCE(passing_score, 0), COALESCE(time_limit_minutes, 0))`,
    `CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_submissions_user ON activity_submissions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_submissions_status ON activity_submissions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_lesson ON reviews(lesson_id)`,
    `CREATE INDEX IF NOT EXISTS idx_certifications_user ON certifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)`
  ];

  console.log('[MIGRATION] Creating missing tables...');
  for (const statement of statements) {
    await run(statement);
  }

  console.log('[MIGRATION] Creating missing indexes...');
  for (const statement of indexes) {
    await run(statement);
  }

  console.log('[MIGRATION] Completed successfully');
}

main().catch((error) => {
  console.error('[MIGRATION] Failed:', error);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
