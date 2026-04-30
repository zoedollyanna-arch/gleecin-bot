/**
 * Admin Middleware
 * Checks if user has admin access
 */

import { get } from '../db/database.js';

/**
 * Verify user is admin
 */
export async function isAdmin(req, res, next) {
  if (process.env.LOCAL_ADMIN_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    req.user = { id: 'local-admin-bypass', is_admin: true };
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
    req.user = { id: 'local-admin-bypass', is_admin: true };
    if (!req.session?.user) {
      req.session = req.session || {};
      req.session.user = {
        id: 'local-admin-bypass',
        discord_id: 'local-admin-bypass',
        username: 'Local Admin',
        is_admin: true,
        roles: []
      };
    }
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
