/**
 * Payment Routes
 * Linden payment verification system for tier upgrades
 */

import express from 'express';
import { isAuthenticated, getUserTier } from '../middleware/auth.js';
import { get, run, all } from '../db/database.js';
import rateLimit from 'express-rate-limit';
import validator from 'validator';

const router = express.Router();

// Rate limit payment submissions (max 5 per hour)
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many payment submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * GET /payment/info
 * Payment information page
 */
router.get('/info', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const tier = getUserTier(user);

    const currentPayment = await get(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    res.render('payment/info', {
      user,
      tier,
      currentPayment,
      recipient: 'zoedollyanna resident',
      paidTier: 'Paid Student - 5000 Lindens',
      advancedTier: 'Advanced Student - 10000 Lindens',
      title: 'Upgrade Your Account'
    });
  } catch (error) {
    console.error('[PAYMENT INFO ERROR]', error);
    res.status(500).render('error', { error: error.message, user: req.session.user });
  }
});

/**
 * POST /payment/submit
 * Submit payment proof
 */
router.post('/submit', isAuthenticated, paymentLimiter, async (req, res) => {
  try {
    const { tier, lindens, proof_text } = req.body;
    const user = req.session.user;

    // Validation
    if (!['paid', 'advanced'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const amount = parseInt(lindens);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Sanitize proof text
    const sanitizedProof = validator.trim(proof_text);
    if (sanitizedProof.length > 500) {
      return res.status(400).json({ error: 'Proof text too long' });
    }

    // Check for duplicate recent submissions
    const recent = await get(
      'SELECT * FROM payments WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'1 hour\' AND status = $2',
      [user.id, 'pending']
    );

    if (recent) {
      return res.status(400).json({ error: 'You already have a pending payment. Please wait for admin review.' });
    }

    // Create payment record
    const payment = await run(
      `INSERT INTO payments (user_id, tier, amount_lindens, status, proof_text, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
       RETURNING *`,
      [user.id, tier, amount, 'pending', sanitizedProof || null]
    );

    res.json({
      success: true,
      paymentId: payment.id,
      message: 'Payment submitted for verification. An admin will review within 24 hours.'
    });
  } catch (error) {
    console.error('[PAYMENT SUBMIT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /payment/status/:paymentId
 * Check payment status
 */
router.get('/status/:paymentId', isAuthenticated, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const user = req.session.user;

    const payment = await get(
      'SELECT * FROM payments WHERE id = $1 AND user_id = $2',
      [paymentId, user.id]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      id: payment.id,
      status: payment.status,
      tier: payment.tier,
      amount: payment.amount_lindens,
      created_at: payment.created_at,
      verified_at: payment.verified_at,
      notes: payment.notes
    });
  } catch (error) {
    console.error('[PAYMENT STATUS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /payment/history
 * User's payment history
 */
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;

    const payments = await all(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    res.json(payments);
  } catch (error) {
    console.error('[PAYMENT HISTORY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
