/**
 * Database Initialization
 * Connects to PostgreSQL database (same as bot) for user data, classes, scripts, etc.
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function seedDefaultPrompts() {
  const existingPrompts = await get('SELECT COUNT(*)::int AS count FROM prompts');
  if ((existingPrompts?.count || 0) > 0) return;

  const starterPrompts = [
    {
      title: 'Debug a failing API route',
      category: 'debugging',
      description: 'Find the root cause, inspect the request flow, and fix the issue without hiding errors.',
      prompt_text: 'You are debugging a production API route. First identify the exact failing file, line, and request path. Then explain why it fails, patch the root cause, and verify the endpoint with a real request. Do not use try/catch to hide the bug. Return the minimal safe fix and any test command you used.',
      is_public: true
    },
    {
      title: 'Build a clean React form',
      category: 'ui',
      description: 'Generate a maintainable, accessible form with validation and polished spacing.',
      prompt_text: 'Create a React form component with accessible labels, inline validation, disabled submit state, and clear error messages. Keep the layout responsive, avoid overflow, and use reusable subcomponents for inputs and helper text. Include the expected props and how the form state should be handled.',
      is_public: true
    },
    {
      title: 'Optimize a slow database query',
      category: 'optimization',
      description: 'Improve query performance while preserving behavior.',
      prompt_text: 'Analyze the SQL query for bottlenecks, suggest indexes if needed, and rewrite the query for better performance without changing results. Explain the tradeoffs, show the optimized query, and mention what data shape or cardinality assumptions you are making.',
      is_public: true
    },
    {
      title: 'Design a backend CRUD endpoint',
      category: 'backend',
      description: 'Create a safe CRUD API with validation and error handling.',
      prompt_text: 'Design a production-ready CRUD endpoint for a backend service. Include route definitions, validation rules, status codes, persistence logic, and error responses. Ensure the code matches the database schema and does not accept invalid input.',
      is_public: true
    },
    {
      title: 'Write a regression test plan',
      category: 'testing',
      description: 'Build a test plan that catches the current bug and future regressions.',
      prompt_text: 'Create a regression test plan for this feature. List the core success path, invalid input cases, permission checks, and the exact assertions needed to prevent regressions. Include both automated and manual verification steps.',
      is_public: true
    },
    {
      title: 'Refactor a messy component',
      category: 'ui',
      description: 'Split a large UI component into smaller maintainable pieces.',
      prompt_text: 'Refactor the provided large UI component into smaller files with clear responsibilities. Preserve behavior, improve readability, and remove duplicate logic. Explain the new file structure and the props passed between components.',
      is_public: true
    },
    {
      title: 'Add API validation rules',
      category: 'backend',
      description: 'Strengthen request validation before persistence.',
      prompt_text: 'Add strict validation for this API endpoint. Validate required fields, data types, maximum lengths, and allowed values. Reject invalid payloads with meaningful 4xx responses and ensure the database only receives sanitized input.',
      is_public: true
    },
    {
      title: 'Improve error handling',
      category: 'debugging',
      description: 'Make failures obvious and actionable.',
      prompt_text: 'Audit the error handling path and replace vague failures with precise, actionable messages. Preserve stack traces in logs, return useful client-facing errors, and avoid swallowing exceptions or silently defaulting incorrect values.',
      is_public: true
    },
    {
      title: 'Plan a feature rollout',
      category: 'architecture',
      description: 'Break a feature into safe implementation phases.',
      prompt_text: 'Create a phased rollout plan for a new feature. Include schema changes, backend routes, frontend components, migrations, verification steps, and rollback considerations. Make the plan realistic for a production app.',
      is_public: true
    },
    {
      title: 'Review schema consistency',
      category: 'architecture',
      description: 'Check that code, API, and database all match.',
      prompt_text: 'Review the codebase for schema mismatches between frontend, API routes, and database tables. Identify inconsistencies, propose the exact schema updates, and list the files that must change so everything stays aligned.',
      is_public: true
    }
  ];

  for (const prompt of starterPrompts) {
    await query(
      `INSERT INTO prompts (title, category, prompt_text, description, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [prompt.title, prompt.category, prompt.prompt_text, prompt.description, prompt.is_public]
    );
  }
}

async function seedDefaultClasses() {
  await query(
    `INSERT INTO classes (name, description, level, duration, instructor, price_tier, start_date, end_date, max_students, current_students, topics, requirements, created_at)
     SELECT $1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, $9, 0, $10, $11, NOW()
     WHERE NOT EXISTS (SELECT 1 FROM classes WHERE LOWER(name) = LOWER($1))`,
    [
      'Scripting Fundamentals',
      'Learn the basics of scripting from the ground up. This course covers variables, data types, control flow, functions, event handling, and practical production workflows.',
      'beginner',
      '2 weeks',
      'jwett',
      'free',
      '2026-05-04 18:00:00',
      '2026-05-13 20:00:00',
      0,
      'Variables and data types, Control flow, Functions and scope, Event handling, Debugging techniques, Best practices',
      'Basic computer skills, Willingness to learn, Access to virtual world client'
    ]
  );
}

export async function initializeDatabase() {
  try {
    await query('SELECT 1');
    console.log('[DB] ✅ Connected to PostgreSQL');

    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      `CREATE TABLE IF NOT EXISTS classes (
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
      )`,
      `CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'enrolled' CHECK (status IN ('pending', 'enrolled', 'completed', 'cancelled')),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, class_id)
      )`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS certifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_name TEXT NOT NULL,
        certificate_url TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        certificate_id TEXT UNIQUE,
        is_custom BOOLEAN DEFAULT false,
        shared BOOLEAN DEFAULT false,
        shared_at TIMESTAMP,
        pdf_url TEXT,
        completion_date TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_name TEXT NOT NULL,
        certificate_url TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        certificate_id TEXT UNIQUE,
        is_custom BOOLEAN DEFAULT false,
        shared BOOLEAN DEFAULT false,
        shared_at TIMESTAMP,
        pdf_url TEXT,
        completion_date TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS scripts (
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
      )`,
      `CREATE TABLE IF NOT EXISTS script_downloads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS lessons (
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
      )`,
      `CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed BOOLEAN DEFAULT false,
        watch_time_seconds INTEGER DEFAULT 0,
        progress_percent INTEGER DEFAULT 0,
        last_watched_at TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      )`,
      `CREATE TABLE IF NOT EXISTS schedules (
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
      )`,
      `CREATE TABLE IF NOT EXISTS challenges (
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
      )`,
      `CREATE TABLE IF NOT EXISTS challenge_submissions (
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
      )`,
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
        question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'debugging', 'prediction', 'scenario_based', 'code')),
        options JSONB,
        correct_answer TEXT,
        explanation TEXT,
        points INTEGER DEFAULT 1,
        order_index INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT quiz_question_options_required CHECK (
          question_type NOT IN ('multiple_choice', 'true_false')
          OR (options IS NOT NULL AND jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2)
        )
      )`,
      `CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        score INTEGER,
        passed BOOLEAN DEFAULT false,
        answers JSONB,
        time_spent_seconds INTEGER,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        content TEXT,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS activities (
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
      )`,
      `CREATE TABLE IF NOT EXISTS activity_submissions (
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
      )`,
      `CREATE TABLE IF NOT EXISTS payments (
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
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        is_reply BOOLEAN DEFAULT false,
        parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
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
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS session_requests (
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
      )`,
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        target_user_id INTEGER REFERENCES users(id),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        important BOOLEAN DEFAULT false,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS support_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const statement of schemaStatements) {
      await query(statement);
    }

    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_scripts_title_unique ON scripts (LOWER(title))`,
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
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_content_unique ON challenges (LOWER(COALESCE(description, '')), LOWER(COALESCE(starter_code, '')), LOWER(COALESCE(solution, '')), LOWER(COALESCE(explanation, '')))` ,
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
      `CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category)`,
      `CREATE INDEX IF NOT EXISTS idx_prompts_public ON prompts(is_public)`,
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`
    ];

    for (const statement of indexStatements) {
      await query(statement);
    }

    await seedDefaultPrompts();
    await seedDefaultClasses();
  } catch (error) {
    console.error('[DB] Connection error:', error);
    throw error;
  }
}

export function getDatabase() {
  return {
    run: async (sql, params) => await query(sql, params),
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

export async function run(sql, params = []) {
  const result = await query(sql, params);
  return { id: result.rows[0]?.id || null, changes: result.rowCount };
}

export async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

export async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

export async function closeDatabase() {
  await pool.end();
}
