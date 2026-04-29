/**
 * 1-on-1 Session Requests
 * Student → Admin approval workflow
 */

import express from 'express';
import { isAuthenticated, adminOnly } from '../middleware/admin.js';
import { all, get, run } from '../db/database.js';

const router = express.Router();

// Student: Request session
router.post('/request-session', isAuthenticated, async (req, res) => {
  try {
    const { topic, preferred_time, duration } = req.body;
    const userId = req.session.user.id; // from Discord ID

    const sessionId = await run(`
      INSERT INTO sessions (student_id, topic, preferred_time, duration, status) 
      VALUES ($1, $2, $3, $4, 'pending') RETURNING id
    `, [userId, topic, preferred_time, duration]);

    res.json({ success: true, sessionId: sessionId.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student: View my requests
router.get('/my-sessions', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const sessions = await all(`
    SELECT * FROM sessions WHERE student_id = $1 ORDER BY created_at DESC
  `, [userId]);

  res.json(sessions);
});

// Admin: View/approve all requests
router.get('/session-requests', adminOnly, async (req, res) => {
  const sessions = await all(`
    SELECT s.*, u.username as student_name 
    FROM sessions s 
    JOIN users u ON s.student_id = u.id 
    ORDER BY s.created_at DESC
  `);

  res.render('admin/session-requests', { sessions, user: req.session.user });
});

router.post('/session-requests/:id/approve', adminOnly, async (req, res) => {
  const { id } = req.params;
  await run('UPDATE sessions SET status = $1, admin_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', 
    ['approved', req.session.user.id, id]
  );
  res.json({ success: true });
});

router.post('/session-requests/:id/reject', adminOnly, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  await run('UPDATE sessions SET status = $1, admin_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', 
    ['rejected', reason || 'No reason provided', id]
  );
  res.json({ success: true });
});

export default router;

