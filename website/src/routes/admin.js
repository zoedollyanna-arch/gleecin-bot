/**
 * Admin Routes
 * Full admin panel for user management, content management, and payment verification
 */

import express from 'express';
import multer from 'multer';
import { adminOnly, isAdmin } from '../middleware/admin.js';
import { all, get, run } from '../db/database.js';
import { v4 as uuid } from 'uuid';
import path from 'node:path';
import fs from 'node:fs/promises';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'website/uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.mp4', '.webm', '.jpg', '.png', '.gif', '.zip', '.js', '.ts'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  }
});

// ---- DASHBOARD ----

/**
 * GET /admin
 * Main admin dashboard
 */
router.get('/', adminOnly, async (req, res) => {
  try {
    const stats = await all(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE tier = 'paid' OR tier = 'advanced') as paid_users,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM scripts) as total_scripts,
        (SELECT COUNT(*) FROM lessons) as total_lessons,
        (SELECT COUNT(*) FROM certifications) as issued_certs
    `);

    const recentPayments = await all(`
      SELECT p.*, u.username 
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    res.render('admin/dashboard', {
      user: req.session.user,
      stats: stats[0],
      recentPayments,
      title: 'Admin Dashboard'
    });
  } catch (error) {
    console.error('[ADMIN DASHBOARD ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

// ---- USERS MANAGEMENT ----

/**
 * GET /admin/users
 * List all users
 */
router.get('/users', adminOnly, async (req, res) => {
  try {
    const users = await all(`
      SELECT id, username, email, tier, is_admin, joined_at, last_login
      FROM users
      ORDER BY joined_at DESC
    `);

    res.render('admin/users', {
      user: req.session.user,
      users,
      title: 'User Management'
    });
  } catch (error) {
    console.error('[USERS LIST ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/users/:userId/make-admin
 * Promote user to admin
 */
router.post('/users/:userId/make-admin', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await run('UPDATE users SET is_admin = true WHERE id = $1', [userId]);
    await run(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, 'make_admin', userId, JSON.stringify({})]
    );

    res.json({ success: true, message: 'User promoted to admin' });
  } catch (error) {
    console.error('[MAKE ADMIN ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:userId/set-tier
 * Set user's access tier
 */
router.post('/users/:userId/set-tier', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { tier } = req.body;

    if (!['free', 'paid', 'advanced'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    await run('UPDATE users SET tier = $1 WHERE id = $2', [tier, userId]);
    await run(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, 'set_tier', userId, JSON.stringify({ tier })]
    );

    res.json({ success: true, message: `User tier set to ${tier}` });
  } catch (error) {
    console.error('[SET TIER ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- PAYMENTS MANAGEMENT ----

/**
 * GET /admin/payments
 * List all payments
 */
router.get('/payments', adminOnly, async (req, res) => {
  try {
    const payments = await all(`
      SELECT p.*, u.username 
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.render('admin/payments', {
      user: req.session.user,
      payments,
      title: 'Payment Management'
    });
  } catch (error) {
    console.error('[PAYMENTS LIST ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/payments/:paymentId/verify
 * Verify a payment (manual approval)
 */
router.post('/payments/:paymentId/verify', isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { notes } = req.body;

    const payment = await get('SELECT * FROM payments WHERE id = $1', [paymentId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    await run(
      'UPDATE payments SET status = $1, verified_by = $2, verified_at = NOW(), notes = $3 WHERE id = $4',
      ['verified', req.session.user.id, notes || '', paymentId]
    );

    // Update user tier (assume payment is for the tier specified)
    await run('UPDATE users SET tier = $1 WHERE id = $2', [payment.tier, payment.user_id]);

    // Log action
    await run(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, 'verify_payment', payment.user_id, JSON.stringify({ paymentId, notes })]
    );

    res.json({ success: true, message: 'Payment verified' });
  } catch (error) {
    console.error('[VERIFY PAYMENT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/payments/:paymentId/reject
 * Reject a payment
 */
router.post('/payments/:paymentId/reject', isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await get('SELECT * FROM payments WHERE id = $1', [paymentId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await run(
      'UPDATE payments SET status = $1, verified_by = $2, verified_at = NOW(), notes = $3 WHERE id = $4',
      ['rejected', req.session.user.id, reason || '', paymentId]
    );

    await run(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, 'reject_payment', payment.user_id, JSON.stringify({ paymentId, reason })]
    );

    res.json({ success: true, message: 'Payment rejected' });
  } catch (error) {
    console.error('[REJECT PAYMENT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- SCRIPT UPLOADS ----

/**
 * GET /admin/scripts
 * Script management
 */
router.get('/scripts', adminOnly, async (req, res) => {
  try {
    const scripts = await all(`
      SELECT s.*, u.username as author
      FROM scripts s
      LEFT JOIN users u ON s.author_id = u.id
      ORDER BY s.created_at DESC
    `);

    res.render('admin/scripts', {
      user: req.session.user,
      scripts,
      title: 'Script Management'
    });
  } catch (error) {
    console.error('[SCRIPTS LIST ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/scripts/upload
 * Upload a new script
 */
router.post('/scripts/upload', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description, category, tier, code, explanation, use_cases, common_mistakes } = req.body;

    const scriptId = await run(
      `INSERT INTO scripts (title, description, category, author_id, price_tier, code, explanation, 
       use_cases, common_mistakes, file_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
      [title, description, category, req.session.user.id, tier, code, explanation, use_cases, common_mistakes, req.file.path]
    );

    await run(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.session.user.id, 'upload_script', JSON.stringify({ scriptId: scriptId.id, title })]
    );

    res.json({ success: true, scriptId: scriptId.id, message: 'Script uploaded' });
  } catch (error) {
    console.error('[SCRIPT UPLOAD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- LESSONS UPLOADS ----

/**
 * GET /admin/lessons
 * Lesson management
 */
router.get('/lessons', adminOnly, async (req, res) => {
  try {
    const lessons = await all(`
      SELECT l.*, u.username as creator
      FROM lessons l
      LEFT JOIN users u ON l.creator_id = u.id
      ORDER BY l.created_at DESC
    `);

    res.render('admin/lessons', {
      user: req.session.user,
      lessons,
      title: 'Lesson Management'
    });
  } catch (error) {
    console.error('[LESSONS LIST ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/lessons/create
 * Add a new lesson
 */
router.post('/lessons/create', isAdmin, async (req, res) => {
  try {
    const { title, description, level, duration, video_url, video_type, tier } = req.body;

    if (!['youtube', 'vimeo', 'google_drive', 'uploaded'].includes(video_type)) {
      return res.status(400).json({ error: 'Invalid video type' });
    }

    const lessonId = await run(
      `INSERT INTO lessons (title, description, level, duration, video_url, video_type, 
       price_tier, creator_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
      [title, description, level, duration, video_url, video_type, tier, req.session.user.id]
    );

    res.json({ success: true, lessonId: lessonId.id, message: 'Lesson created' });
  } catch (error) {
    console.error('[LESSON CREATE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- CERTIFICATIONS ----

/**
 * GET /admin/certifications
 * Certification management
 */
router.get('/certifications', adminOnly, async (req, res) => {
  try {
    const certs = await all(`
      SELECT c.*, u.username
      FROM certifications c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.completion_date DESC
    `);

    res.render('admin/certifications', {
      user: req.session.user,
      certs,
      title: 'Certification Management'
    });
  } catch (error) {
    console.error('[CERTS LIST ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

// ---- LOGS ----

/**
 * GET /admin/logs
 * Admin activity logs
 */
router.get('/logs', adminOnly, async (req, res) => {
  try {
    const logs = await all(`
      SELECT al.*, a.username as admin_name, t.username as target_name
      FROM admin_logs al
      JOIN users a ON al.admin_id = a.id
      LEFT JOIN users t ON al.target_user_id = t.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    res.render('admin/logs', {
      user: req.session.user,
      logs,
      title: 'Admin Logs'
    });
  } catch (error) {
    console.error('[LOGS ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

// ---- SESSION REQUESTS ----

/**
 * GET /admin/session-requests
 * View and manage 1-on-1 session requests
 */
router.get('/session-requests', adminOnly, async (req, res) => {
  try {
    const requests = await all(`
      SELECT sr.*, u.username, u.email
      FROM session_requests sr
      JOIN users u ON sr.user_id = u.id
      ORDER BY sr.status ASC, sr.created_at DESC
    `);

    res.render('admin/session-requests', {
      user: req.session.user,
      requests,
      title: 'Session Requests'
    });
  } catch (error) {
    console.error('[SESSION REQUESTS ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/session-requests/:id/approve
 * Approve a session request
 */
router.post('/session-requests/:id/approve', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, notes } = req.body;

    await run(
      `UPDATE session_requests 
       SET status = $1, approved_by = $2, scheduled_at = $3, notes = $4 
       WHERE id = $5`,
      ['approved', req.user.id, scheduled_at, notes || '', id]
    );

    await run(
      'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'approve_session', null, JSON.stringify({ requestId: id })]
    );

    res.json({ success: true, message: 'Session request approved' });
  } catch (error) {
    console.error('[APPROVE SESSION ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/session-requests/:id/reject
 * Reject a session request
 */
router.post('/session-requests/:id/reject', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await run(
      `UPDATE session_requests 
       SET status = $1, notes = $2 
       WHERE id = $3`,
      ['rejected', notes || '', id]
    );

    await run(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'reject_session', JSON.stringify({ requestId: id })]
    );

    res.json({ success: true, message: 'Session request rejected' });
  } catch (error) {
    console.error('[REJECT SESSION ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/session-requests/:id/complete
 * Mark session as completed
 */
router.post('/session-requests/:id/complete', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await run(
      `UPDATE session_requests 
       SET status = $1, completed_at = NOW(), notes = $2 
       WHERE id = $3`,
      ['completed', notes || '', id]
    );

    res.json({ success: true, message: 'Session marked as completed' });
  } catch (error) {
    console.error('[COMPLETE SESSION ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- MESSAGES ----

/**
 * GET /admin/messages
 * View support messages/tickets
 */
router.get('/messages', adminOnly, async (req, res) => {
  try {
    const messages = await all(`
      SELECT m.*, 
        u_sender.username as sender_name,
        u_recipient.username as recipient_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_recipient ON m.recipient_id = u_recipient.id
      WHERE m.is_reply = false
      ORDER BY m.is_read ASC, m.created_at DESC
    `);

    const unread = await get(
      `SELECT COUNT(*) as count FROM messages 
       WHERE is_read = false AND recipient_id = $1`,
      [req.user.id]
    );

    res.render('admin/messages', {
      user: req.session.user,
      messages,
      unreadCount: unread.count,
      title: 'Support Messages'
    });
  } catch (error) {
    console.error('[MESSAGES ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /admin/messages/:id/reply
 * Reply to a message
 */
router.post('/messages/:id/reply', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const originalMessage = await get('SELECT sender_id FROM messages WHERE id = $1', [id]);

    if (!originalMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const replyId = await run(
      `INSERT INTO messages (sender_id, recipient_id, subject, content, is_reply, parent_message_id, created_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW()) RETURNING id`,
      [req.user.id, originalMessage.sender_id, 'Re: Support', content, id]
    );

    await run(
      'UPDATE messages SET is_read = true WHERE id = $1',
      [id]
    );

    res.json({ success: true, replyId: replyId.id });
  } catch (error) {
    console.error('[REPLY MESSAGE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
