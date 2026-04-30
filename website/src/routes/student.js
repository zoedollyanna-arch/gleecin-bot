/**
 * Student Routes
 * Handles student dashboard, session requests, messaging, learning, and progress tracking
 */

import express from 'express';
import { isAuthenticated, getUserTier } from '../middleware/auth.js';
import { all, get, run } from '../db/database.js';

const router = express.Router();

async function getDbUser(user) {
  const discordId = user?.discord_id || user?.id;
  return get('SELECT id, username, discord_id FROM users WHERE discord_id = $1', [discordId]);
}

function mapRowsById(rows, key) {
  const result = {};
  rows.forEach((row) => {
    result[row[key]] = row;
  });
  return result;
}

router.get('/sessions', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const dbUser = await getDbUser(user);

    if (!dbUser) {
      return res.status(404).render('error', { error: 'User not found', user });
    }

    const sessions = await all(`
      SELECT s.*, a.username AS admin_name
      FROM sessions s
      LEFT JOIN users a ON s.admin_id = a.id
      WHERE s.student_id = $1
      ORDER BY s.updated_at DESC, s.created_at DESC
    `, [dbUser.id]);

    res.render('student/sessions', {
      user,
      sessions,
      title: 'My Sessions'
    });
  } catch (error) {
    console.error('[STUDENT SESSIONS ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load sessions', user: req.session.user });
  }
});

/**
 * POST /student/sessions/request
 * Create a new session request
 */
router.post('/sessions/request', isAuthenticated, async (req, res) => {
  try {
    const { title, description, requested_date } = req.body;
    const user = req.session.user;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }

    const dbUser = await getDbUser(user);

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const topic = String(title).trim();
    const adminNotes = String(description).trim();
    const preferredTime = requested_date || null;

    const result = await run(
      `INSERT INTO sessions (student_id, admin_id, topic, preferred_time, duration, status, admin_notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
      [dbUser.id, null, topic, preferredTime, null, 'pending', adminNotes]
    );

    console.log('[SESSIONS] created session request', {
      sessionId: result.id,
      studentId: dbUser.id,
      topic,
      preferredTime
    });

    res.json({ success: true, sessionId: result.id });
  } catch (error) {
    console.error('[SESSION REQUEST ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /student/messages
 * View student's message inbox
 */
router.get('/messages', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const dbUser = await getDbUser(user);

    if (!dbUser) {
      return res.status(404).render('error', { error: 'User not found', user });
    }

    const messages = await all(`
      SELECT m.*, 
        u_sender.username as sender_name,
        u_sender.avatar_url as sender_avatar
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      WHERE m.recipient_id = $1
      ORDER BY m.is_read ASC, m.created_at DESC
    `, [dbUser.id]);

    const unread = await get(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
      [dbUser.id]
    );

    res.render('student/messages', {
      user,
      messages,
      unreadCount: unread.count,
      title: 'My Messages'
    });
  } catch (error) {
    console.error('[STUDENT MESSAGES ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load messages', user: req.session.user });
  }
});

/**
 * POST /student/messages/send
 * Send a new support message
 */
router.post('/messages/send', isAuthenticated, async (req, res) => {
  try {
    const { subject, content } = req.body;
    const user = req.session.user;

    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content required' });
    }

    const dbUser = await getDbUser(user);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get admin user (first admin, or default)
    const admin = await get('SELECT id FROM users WHERE is_admin = true LIMIT 1');
    if (!admin) {
      return res.status(500).json({ error: 'Admin not available' });
    }

    const result = await run(
      `INSERT INTO messages (sender_id, recipient_id, subject, content, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [dbUser.id, admin.id, subject, content]
    );

    res.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('[SEND MESSAGE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /student/messages/:id/mark-read
 * Mark message as read
 */
router.post('/messages/:id/mark-read', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    await run('UPDATE messages SET is_read = true WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('[MARK READ ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /student/lessons
 * View available lessons
 */
router.get('/lessons', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const tier = getUserTier(user);
    const dbUser = await get('SELECT id FROM users WHERE discord_id = $1', [user.id]);

    if (!dbUser) {
      return res.status(404).render('error', { error: 'User not found', user });
    }

    const lessons = await all(`
      SELECT l.*, 
        COUNT(DISTINCT lp.id) as student_watching
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
      WHERE l.price_tier = 'free' OR l.price_tier = $1
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `, [tier]);

    const progress = await all(`
      SELECT * FROM lesson_progress
      WHERE user_id = $1
    `, [dbUser.id]);

    const progressMap = {};
    progress.forEach(p => {
      progressMap[p.lesson_id] = p;
    });

    res.render('student/lessons', {
      user,
      lessons,
      progressMap,
      tier,
      title: 'Lesson Vault'
    });
  } catch (error) {
    console.error('[STUDENT LESSONS ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load lessons', user: req.session.user });
  }
});

/**
 * GET /student/lessons/:id
 * View individual lesson
 */
router.get('/lessons/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;
    const tier = getUserTier(user);

    const lesson = await get('SELECT * FROM lessons WHERE id = $1', [id]);

    if (!lesson) {
      return res.status(404).render('error', { error: 'Lesson not found', user });
    }

    if (lesson.price_tier !== 'free' && lesson.price_tier !== tier) {
      return res.status(403).render('error', { error: 'Access denied', user });
    }

    const dbUser = await get('SELECT id FROM users WHERE discord_id = $1', [user.id]);
    const progress = await get(
      'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
      [dbUser.id, id]
    );

    res.render('student/lesson-detail', {
      user,
      lesson,
      progress,
      tier,
      title: lesson.title
    });
  } catch (error) {
    console.error('[LESSON DETAIL ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load lesson', user: req.session.user });
  }
});

/**
 * GET /student/activities
 * View coding activities and challenges
 */
router.get('/activities', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const tier = getUserTier(user);
    const dbUser = await getDbUser(user);

    if (!dbUser) {
      return res.status(404).render('error', { error: 'User not found', user });
    }

    const activities = await all(`
      SELECT c.*, COUNT(cs.id)::int AS submission_count,
        SUM(CASE WHEN cs.status = 'passed' THEN 1 ELSE 0 END)::int AS completion_count
      FROM challenges c
      LEFT JOIN challenge_submissions cs ON cs.challenge_id = c.id
      WHERE c.price_tier = 'free'
         OR (c.price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (c.price_tier = 'advanced' AND $1 = 'advanced')
      GROUP BY c.id
      ORDER BY c.difficulty ASC, c.created_at DESC
    `, [tier]);

    const submissions = await all(`
      SELECT cs.*, c.title AS challenge_title
      FROM challenge_submissions cs
      JOIN challenges c ON cs.challenge_id = c.id
      WHERE cs.user_id = $1
      ORDER BY cs.submitted_at DESC
    `, [dbUser.id]);

    const submissionMap = {};
    submissions.forEach((submission) => {
      submissionMap[submission.challenge_id] = submission;
    });

    console.log('[STUDENT] loaded challenges', { studentId: dbUser.id, count: activities.length });

    res.render('student/activities', {
      user,
      activities,
      submissionMap,
      tier,
      title: 'Coding Activities'
    });
  } catch (error) {
    console.error('[STUDENT ACTIVITIES ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load activities', user: req.session.user });
  }
});

/**
 * GET /student/quizzes
 * View available quizzes
 */
router.get('/quizzes', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const tier = getUserTier(user);
    const dbUser = await getDbUser(user);

    if (!dbUser) {
      return res.status(404).render('error', { error: 'User not found', user });
    }

    const quizzes = await all(`
      SELECT q.id, q.title, q.description, q.lesson_id, q.difficulty, q.passing_score,
             q.time_limit_minutes, q.price_tier, q.created_by, q.created_at,
             l.title AS lesson_title,
             COUNT(DISTINCT qq.id)::int AS question_count,
             COUNT(DISTINCT qa.id)::int AS attempt_count
      FROM quizzes q
      LEFT JOIN lessons l ON q.lesson_id = l.id
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $2
      WHERE q.price_tier = 'free'
         OR (q.price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (q.price_tier = 'advanced' AND $1 = 'advanced')
      GROUP BY q.id, l.title
      ORDER BY q.created_at DESC
    `, [tier, dbUser.id]);

    const attempts = await all(`
      SELECT * FROM quiz_attempts
      WHERE user_id = $1
      ORDER BY attempted_at DESC
    `, [dbUser.id]);

    const attemptMap = {};
    attempts.forEach((attempt) => {
      if (!attemptMap[attempt.quiz_id]) attemptMap[attempt.quiz_id] = [];
      attemptMap[attempt.quiz_id].push(attempt);
    });

    res.render('student/quizzes', {
      user,
      quizzes,
      attemptMap,
      tier,
      title: 'Interactive Quizzes'
    });
  } catch (error) {
    console.error('[STUDENT QUIZZES ERROR]', error);
    res.status(500).render('error', { error: 'Failed to load quizzes', user: req.session.user });
  }
});

export default router;
