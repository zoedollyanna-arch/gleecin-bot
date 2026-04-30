/**
 * Admin Middleware
 * Checks if user has admin access
 */

import { get } from '../db/database.js';

/**
 * Verify user is admin
 */
async function ensureLocalAdminUser(req) {
  const localAdmin = await get(
    `INSERT INTO users (discord_id, username, is_admin)
     VALUES ($1, $2, true)
     ON CONFLICT (discord_id)
     DO UPDATE SET username = EXCLUDED.username, is_admin = true
     RETURNING id, username, is_admin`,
    ['local-admin-bypass', 'Local Admin']
  );

  req.session = req.session || {};
  req.session.user = {
    id: localAdmin.id,
    discord_id: 'local-admin-bypass',
    username: localAdmin.username,
    is_admin: localAdmin.is_admin,
    roles: []
  };
  req.user = { id: localAdmin.id, is_admin: true };
}

export async function isAdmin(req, res, next) {
  if (process.env.LOCAL_ADMIN_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    await ensureLocalAdminUser(req);
    return next();
  }

  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await get(
      'SELECT id, is_admin FROM users WHERE discord_id = $1',
      [req.session.user.discord_id || req.session.user.id]
    );

    if (!user?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
}

/**
 * Admin-only render
 */
export async function adminOnly(req, res, next) {
  if (process.env.LOCAL_ADMIN_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    await ensureLocalAdminUser(req);
    return next();
  }

  if (!req.session?.user) {
    return res.redirect('/auth/login');
  }

  try {
    const user = await get(
      'SELECT id, is_admin FROM users WHERE discord_id = $1',
      [req.session.user.discord_id || req.session.user.id]
    );

    if (!user?.is_admin) {
      return res.status(403).render('error', {
        error: 'Admin access required',
        user: req.session.user,
        isAuth: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]', error);
    res.status(500).render('error', {
      error: 'Authentication failed',
      user: req.session.user,
      isAuth: !!req.session.user
    });
  }
}
