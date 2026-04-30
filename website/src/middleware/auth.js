/**
 * Authentication Middleware
 * Handles Discord OAuth verification and role-based access
 */

import axios from 'axios';

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GUILD_ID } = process.env;
const MAX_WAIT_TIME = 30000; // 30 seconds max wait per attempt for rate limits
const BASE_DELAY = 1000;

/**
 * Middleware: Check if user is authenticated
 * Only checks session existence - does NOT hit Discord API on every request
 * to avoid rate limits. Token validity is checked only during login or
 * when explicitly needed.
 */
export async function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' }).end();
    }
    return res.redirect('/login');
  }

  // Check if token needs refresh (only once per hour to avoid rate limits)
  const now = Date.now();
  const lastVerified = req.session.user.tokenVerifiedAt || 0;
  const ONE_HOUR = 60 * 60 * 1000;

  if (now - lastVerified > ONE_HOUR) {
    try {
      await verifyDiscordToken(req.session.user.token);
      req.session.user.tokenVerifiedAt = now;
    } catch (error) {
      // Token expired, try to refresh it
      try {
        const refreshedToken = await refreshDiscordToken(req.session.user.refreshToken);
        req.session.user.token = refreshedToken.access_token;
        req.session.user.refreshToken = refreshedToken.refresh_token;
        req.session.user.tokenVerifiedAt = now;
      } catch (refreshError) {
        console.error('[AUTH REFRESH ERROR]', refreshError.message);
        req.session.destroy(() => {});
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
      }
    }
  }

  next();
}

/**
 * Middleware: Check if user has required role
 */
export function checkRole(requiredRole) {
  return async (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const hasRole = await verifyUserRole(req.session.user, requiredRole);
      
      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('[AUTH ERROR]', error);
      res.status(500).json({ error: 'Authentication verification failed' });
    }
  };
}

/**
 * Shared rate limit retry helper
 */
async function handleRateLimit(error, attempt, maxRetries, operation) {
  const isRateLimit = error.response?.status === 429;
  if (!isRateLimit || attempt >= maxRetries) {
    throw error;
  }

  const retryAfter = error.response?.headers?.['retry-after'];
  let delay;

  if (retryAfter) {
    const waitMs = parseInt(retryAfter, 10) * 1000;
    if (waitMs > MAX_WAIT_TIME) {
      const minutes = Math.round(waitMs / 60000);
      throw new Error(`Discord global rate limit (${operation}). Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
    }
    delay = waitMs;
    console.warn(`[${operation}] Rate limited, respecting Retry-After: ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
  } else {
    delay = BASE_DELAY * Math.pow(2, attempt - 1);
    console.warn(`[${operation}] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
  }

  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Verify Discord OAuth token
 * Includes retry logic for rate limits
 */
export async function verifyDiscordToken(token) {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      await handleRateLimit(error, attempt, MAX_RETRIES, 'TOKEN VERIFY');
      continue;
    }
  }
  throw new Error('Invalid Discord token (max retries exceeded)');
}

/**
 * Refresh Discord OAuth token using refresh token
 * Includes retry logic for rate limits
 */
export async function refreshDiscordToken(refreshToken) {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: 'identify email guilds.members.read'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      await handleRateLimit(error, attempt, MAX_RETRIES, 'TOKEN REFRESH');
      continue;
    }
  }
  throw new Error('Failed to refresh Discord token (max retries exceeded)');
}

/**
 * Generate Discord OAuth URL
 */
export function getDiscordOAuthURL(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds.members.read',
    prompt: 'none'
  });

  if (state) {
    params.append('state', state);
  }

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange Discord OAuth code for token
 * Includes retry logic with exponential backoff for rate limits
 * Respects Discord's Retry-After header for global rate limits
 */
export async function exchangeOAuthCode(code, redirectUri) {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          scope: 'identify email guilds.members.read'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      await handleRateLimit(error, attempt, MAX_RETRIES, 'OAUTH');
      continue;
    }
  }
  throw new Error('Failed to exchange OAuth code (max retries exceeded)');
}

/**
 * Get user info from Discord
 * Includes retry logic for rate limits
 */
export async function getDiscordUserInfo(token) {
  const MAX_RETRIES = 2;

  // First, get user data with retry logic
  let user;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      user = userResponse.data;
      break;
    } catch (error) {
      await handleRateLimit(error, attempt, MAX_RETRIES, 'OAUTH USER');
      continue;
    }
  }

  // Then, get guild member data with retry logic
  let member = null;
  if (GUILD_ID) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const memberResponse = await axios.get(
          `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        member = memberResponse.data;
        break;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('User is not in the GLEECIN guild');
        }
        await handleRateLimit(error, attempt, MAX_RETRIES, 'OAUTH MEMBER');
        continue;
      }
    }
  }

  if (!member) {
    throw new Error('User is not in the GLEECIN guild');
  }

  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    email: user.email,
    avatar: user.avatar,
    roles: member.roles || [],
    joinedAt: member.joined_at
  };
}

/**
 * Verify user is in guild and has correct role
 * Includes retry logic for rate limits
 */
export async function verifyUserRole(user, requiredRole) {
  try {
    if (!user.token || !GUILD_ID) {
      console.error('[AUTH] Missing token or guild ID');
      return false;
    }

    let member = null;
    const MAX_RETRIES = 2;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const memberResponse = await axios.get(
          `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          }
        );
        member = memberResponse.data;
        break;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('[AUTH] User not in guild');
          return false;
        }
        await handleRateLimit(error, attempt, MAX_RETRIES, 'ROLE VERIFY');
        continue;
      }
    }
    
    if (!member) {
      console.log('[AUTH] User not in guild');
      return false;
    }

    if (!requiredRole) {
      return true;
    }

    const hasRequiredRole = user.roles.includes(requiredRole);
    
    if (!hasRequiredRole) {
      console.log(`[AUTH] User missing required role: ${requiredRole}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ROLE VERIFICATION ERROR]', error.message);
    return false;
  }
}

/**
 * Get user's tier based on Discord roles
 * Returns: 'free', 'paid', or 'advanced'
 */
export function getUserTier(user) {
  const roles = user?.roles || [];
  
  if (roles.includes(process.env.ADVANCED_STUDENT_ROLE_ID)) {
    return 'advanced';
  } else if (roles.includes(process.env.PAID_STUDENT_ROLE_ID)) {
    return 'paid';
  }
  
  return 'free';
}
