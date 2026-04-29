
/**
 * Authentication Routes
 * Handles Discord OAuth login, callback, and logout
 */

import express from 'express';
import {
  getDiscordOAuthURL,
  exchangeOAuthCode,
  getDiscordUserInfo
} from '../middleware/auth.js';

const router = express.Router();

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

/**
 * GET /auth/login
 * Redirect to Discord OAuth authorization page
 */
router.get('/login', (req, res) => {
  // Generate CSRF state token
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  req.session.oauthState = state;

  const oauthUrl = getDiscordOAuthURL(REDIRECT_URI, state);
  res.redirect(oauthUrl);
});

/**
 * GET /auth/callback
 * Discord OAuth callback handler
 */
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeOAuthCode(code, REDIRECT_URI);

    // Get user info
    const userInfo = await getDiscordUserInfo(tokenData.access_token);

    // Store in session
    req.session.user = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      avatar: userInfo.avatar,
      token: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      roles: userInfo.roles,
      joinedAt: userInfo.joinedAt,
      tokenVerifiedAt: Date.now()
    };

    console.log(`[AUTH] User logged in: ${userInfo.username} (${userInfo.id})`);

    // Redirect to dashboard or referrer
    const redirectTo = req.session.redirectTo || '/dashboard';
    delete req.session.redirectTo;
    res.redirect(redirectTo);
  } catch (error) {
    console.error('[OAUTH CALLBACK ERROR]', error.message);
    
    // Check for rate limit errors and provide better UX
    if (error.message.includes('Discord global rate limit') || error.message.includes('rate limit')) {
      return res.redirect('/login?ratelimit');
    }
    
    res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

});

/**
 * GET /auth/logout
 * Logout user and destroy session
 */
router.get('/logout', (req, res) => {
  if (req.session.user) {
    const username = req.session.user.username;
    req.session.destroy((err) => {
      if (err) {
        console.error('[LOGOUT ERROR]', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      console.log(`[AUTH] User logged out: ${username}`);
      res.redirect('/?message=logged-out');
    });
  } else {
    res.redirect('/');
  }
});

/**
 * GET /auth/user
 * Get current user info (API endpoint)
 */
router.get('/user', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Don't send sensitive tokens to client
  const { token, refreshToken, ...safeUser } = req.session.user;
  res.json(safeUser);
});

/**
 * GET /auth/retry
 * Clear stale session and retry login
 */
router.get('/retry', (req, res) => {
  if (req.session) {
    req.session.oauthState = null;
    // Don't destroy full session, just clear OAuth state
  }
  res.redirect('/login?retry=true');
});

/**
 * GET /auth/status
 * Check authentication status (used by frontend polling)
 */
router.get('/status', (req, res) => {
  if (req.session?.user) {
    res.json({
      authenticated: true,
      user: req.session.user.username
    });
  } else {
    res.json({ authenticated: false });
  }
});


export default router;
