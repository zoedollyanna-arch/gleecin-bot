/**
 * API Routes - PRODUCTION READY
 * All endpoints use real PostgreSQL data
 * No fake data or unsafe execution
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { isAuthenticated, getUserTier } from '../middleware/auth.js';
import { get, all, run } from '../db/database.js';
import { issueCertificate, verifyCertificate } from '../utils/certificates.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(apiLimiter);

// ============ CLASSES ============

router.get('/classes', isAuthenticated, async (req, res) => {
  try {
    const tier = getUserTier(req.session.user);

    const classes = await all(`
      SELECT id, name, description, level, duration, instructor, price_tier,
             current_students, max_students, start_date, end_date
      FROM classes
      WHERE price_tier = 'free' OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (price_tier = 'advanced' AND $1 = 'advanced')
      ORDER BY start_date DESC
    `, [tier]);

    res.json(classes);
  } catch (error) {
    console.error('[CLASSES ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.get('/class/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }

    const classData = await get('SELECT * FROM classes WHERE id = $1', [parseInt(id)]);

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const enrollment = await get('SELECT * FROM enrollments WHERE user_id = $1 AND class_id = $2', [req.session.user.id, id]);

    res.json({
      ...classData,
      isEnrolled: !!enrollment
    });
  } catch (error) {
    console.error('[CLASS DETAIL ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// ============ SCRIPTS ============

router.get('/scripts', async (req, res) => {
  try {
    const { category, search } = req.query;
    const tier = getUserTier(req.session?.user) || 'free';
    const isAdminUser = !!req.session?.user?.is_admin;

    let query = `
      SELECT id, title, description, category, version, language,
             author_id, download_count, view_count, is_public, price_tier,
             created_at, updated_at
      FROM scripts
      WHERE (is_public = true OR $2 = true)
        AND (price_tier = 'free'
          OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
          OR (price_tier = 'advanced' AND $1 = 'advanced'))
    `;

    const params = [tier, isAdminUser];
    let paramIndex = 3;

    if (category) {
      const safeCategory = validator.trim(String(category)).substring(0, 50);
      query += ` AND category = $${paramIndex}`;
      params.push(safeCategory);
      paramIndex += 1;
    }

    if (search) {
      const safeSearch = validator.trim(String(search)).substring(0, 100);
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${safeSearch}%`);
      paramIndex += 1;
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const scripts = await all(query, params);
    res.json(scripts);
  } catch (error) {
    console.error('[SCRIPTS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

router.get('/scripts/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const safe = validator.trim(category).substring(0, 50);
    const tier = getUserTier(req.session?.user) || 'free';
    const isAdminUser = !!req.session?.user?.is_admin;

    const scripts = await all(`
      SELECT id, title, description, category, version,
             author_id, download_count, view_count, price_tier
      FROM scripts
      WHERE (is_public = true OR $3 = true) AND category = $1
        AND (price_tier = 'free'
          OR (price_tier = 'paid' AND ($2 IN ('paid', 'advanced')))
          OR (price_tier = 'advanced' AND $2 = 'advanced'))
      ORDER BY created_at DESC
      LIMIT 50
    `, [safe, tier, isAdminUser]);

    res.json(scripts);
  } catch (error) {
    console.error('[SCRIPTS CATEGORY ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

router.get('/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid script ID' });
    }

    const script = await get('SELECT * FROM scripts WHERE id = $1 AND is_public = true', [parseInt(id)]);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    await run('UPDATE scripts SET view_count = view_count + 1 WHERE id = $1', [id]);

    res.json(script);
  } catch (error) {
    console.error('[SCRIPT DETAIL ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

router.post('/scripts/:id/download', isAuthenticated, submitLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid script ID' });
    }

    const script = await get('SELECT * FROM scripts WHERE id = $1', [parseInt(id)]);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    if (script.price_tier !== 'free') {
      const tier = getUserTier(req.session.user);

      if (script.price_tier === 'advanced' && tier !== 'advanced') {
        return res.status(403).json({ error: 'Advanced tier required' });
      }

      if (script.price_tier === 'paid' && tier === 'free') {
        return res.status(403).json({ error: 'Paid tier required' });
      }
    }

    await run('INSERT INTO script_downloads (user_id, script_id) VALUES ($1, $2)', [req.session.user.id, id]);

    if (script.file_url) {
      res.json({
        url: script.file_url,
        filename: `${script.title.replace(/\s+/g, '-')}.js`
      });
    } else {
      res.json({
        code: script.code || '',
        title: script.title
      });
    }
  } catch (error) {
    console.error('[DOWNLOAD ERROR]', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ============ LESSONS ============

router.get('/lessons', isAuthenticated, async (req, res) => {
  try {
    const tier = getUserTier(req.session.user);

    const lessons = await all(`
      SELECT id, title, description, level, duration, video_type,
             price_tier, creator_id, created_at
      FROM lessons
      WHERE price_tier = 'free'
         OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (price_tier = 'advanced' AND $1 = 'advanced')
      ORDER BY created_at DESC
    `, [tier]);

    res.json(lessons);
  } catch (error) {
    console.error('[LESSONS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

router.get('/lessons/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    const lesson = await get('SELECT * FROM lessons WHERE id = $1', [parseInt(id)]);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const progress = await get('SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2', [req.session.user.id, id]);

    res.json({
      ...lesson,
      progress: progress || null
    });
  } catch (error) {
    console.error('[LESSON DETAIL ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

router.post('/lessons/:id/progress', isAuthenticated, submitLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { watch_time_seconds, completed } = req.body;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    const watchTime = Math.min(parseInt(watch_time_seconds) || 0, 86400);
    const isCompleted = completed === true;

    await run(
      `INSERT INTO lesson_progress (user_id, lesson_id, watch_time_seconds, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET watch_time_seconds = $3, completed = $4, completed_at = $5`,
      [req.session.user.id, id, watchTime, isCompleted, isCompleted ? new Date() : null]
    );

    res.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('[PROGRESS ERROR]', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

  // ============ QUIZZES ============

router.get('/quizzes', isAuthenticated, async (req, res) => {
  try {
    const tier = getUserTier(req.session.user);

    const quizzes = await all(`
      SELECT q.id, q.title, q.description, q.lesson_id, q.difficulty, q.passing_score,
             q.time_limit_minutes, q.price_tier, q.created_by, q.created_at,
             l.title AS lesson_title,
             COUNT(DISTINCT qq.id)::int AS question_count,
             COUNT(DISTINCT qa.id)::int AS attempt_count
      FROM quizzes q
      LEFT JOIN lessons l ON q.lesson_id = l.id
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      WHERE q.price_tier = 'free'
         OR (q.price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (q.price_tier = 'advanced' AND $1 = 'advanced')
      GROUP BY q.id, l.title
      ORDER BY q.created_at DESC
    `, [tier]);

    res.json(quizzes);
  } catch (error) {
    console.error('[QUIZZES ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// ============ CHALLENGES ============

router.get('/challenges', isAuthenticated, async (req, res) => {
  try {
    const tier = getUserTier(req.session.user);

    const challenges = await all(`
      SELECT id, title, description, difficulty, level,
             starter_code, price_tier, created_at
      FROM challenges
      WHERE price_tier = 'free'
         OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))
         OR (price_tier = 'advanced' AND $1 = 'advanced')
      ORDER BY difficulty ASC, created_at DESC
    `, [tier]);

    res.json(challenges);
  } catch (error) {
    console.error('[CHALLENGES ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.post('/challenges/:id/submit', isAuthenticated, submitLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid challenge ID' });
    }

    if (!code || code.length > 10000) {
      return res.status(400).json({ error: 'Invalid code submission' });
    }

    await run(
      `INSERT INTO challenge_submissions (user_id, challenge_id, submitted_code, status)
       VALUES ($1, $2, $3, $4)`,
      [req.session.user.id, id, code, 'submitted']
    );

    res.json({
      success: true,
      message: 'Submission saved. Please have an instructor review your code.',
      executionNote: 'Live code execution is not yet supported. Instructors will review submissions manually.'
    });
  } catch (error) {
    console.error('[SUBMISSION ERROR]', error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// ============ CERTIFICATIONS ============

router.get('/certifications', isAuthenticated, async (req, res) => {
  try {
    const certs = await all(
      'SELECT * FROM certifications WHERE user_id = $1 ORDER BY completion_date DESC',
      [req.session.user.id]
    );

    res.json(certs);
  } catch (error) {
    console.error('[CERTS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

router.post('/certifications/issue', isAuthenticated, async (req, res) => {
  try {
    const { courseName } = req.body;

    if (!courseName || courseName.length > 200) {
      return res.status(400).json({ error: 'Invalid course name' });
    }

    const cert = await issueCertificate(req.session.user.id, courseName);
    res.json(cert);
  } catch (error) {
    console.error('[ISSUE CERT ERROR]', error);
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

router.get('/certifications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const cert = await verifyCertificate(parseInt(id));
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json(cert);
  } catch (error) {
    console.error('[CERT DETAIL ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

router.get('/certifications/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const cert = await get('SELECT * FROM certifications WHERE id = $1', [parseInt(id)]);

    if (!cert || !cert.pdf_url) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const filename = path.basename(cert.pdf_url);
    const filepath = path.join(path.dirname(__filename), '../../uploads/certificates', filename);

    const exists = await fs.stat(filepath).catch(() => null);
    if (!exists) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    res.download(filepath, `GLEECIN-Certificate-${cert.certificate_id}.pdf`);
  } catch (error) {
    console.error('[DOWNLOAD CERT ERROR]', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

router.post('/certifications/:id/share', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isInt(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const cert = await get(
      'SELECT * FROM certifications WHERE id = $1 AND user_id = $2',
      [parseInt(id), req.session.user.id]
    );

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    await run('UPDATE certifications SET shared = true, shared_at = NOW() WHERE id = $1', [id]);

    res.json({
      success: true,
      shareUrl: `/verify/certificate/${cert.certificate_id}`,
      message: 'Certificate shared'
    });
  } catch (error) {
    console.error('[SHARE CERT ERROR]', error);
    res.status(500).json({ error: 'Failed to share certificate' });
  }
});

// ============ SCHEDULE ============

router.get('/schedule', async (req, res) => {
  try {
    const schedule = await all(`
      SELECT s.id, s.title, s.instructor, s.scheduled_date, s.scheduled_time, s.capacity,
             s.description, s.published, s.published_at, s.created_at, s.updated_at,
             c.name AS class_name
      FROM schedules s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY COALESCE(s.scheduled_date::timestamp, s.created_at) DESC NULLS LAST
      LIMIT 20
    `);

    res.json(schedule);
  } catch (error) {
    console.error('[SCHEDULE ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

export default router;
