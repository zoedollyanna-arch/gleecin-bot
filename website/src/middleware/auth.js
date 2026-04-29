

/**
 * Authentication Middleware
 * Handles Discord OAuth verification and role-based access
 */

import axios from 'axios';

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GUILD_ID } = process.env;

/**
 * Middleware: Check if user is authenticated
 * Only checks session existence - does NOT hit Discord API on every request
 * to avoid rate limits. Token validity is checked only during login or
 * when explicitly needed.
 */
export async function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' }).end();
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
        req.session.destroy();
        return res.status(401).json({ error: 'Unauthorized' });
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
 * Verify Discord OAuth token
 * Includes retry logic for rate limits
 */
export async function verifyDiscordToken(token) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      if (isRateLimit && attempt < MAX_RETRIES) {
        const retryAfter = error.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt - 1);
        console.warn(`[TOKEN VERIFY] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error('Invalid Discord token');
    }
  }
}

/**
 * Refresh Discord OAuth token using refresh token
 * Includes retry logic for rate limits
 */
export async function refreshDiscordToken(refreshToken) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

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
      const isRateLimit = error.response?.status === 429;
      if (isRateLimit && attempt < MAX_RETRIES) {
        const retryAfter = error.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt - 1);
        console.warn(`[TOKEN REFRESH] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error('[TOKEN REFRESH ERROR]', error.response?.data || error.message);
      throw new Error('Failed to refresh Discord token');
    }
  }
}

/**
 * Verify user is in guild and has correct role
 * Includes retry logic for rate limits
 */
export async function verifyUserRole(user, requiredRole) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  try {
    if (!user.token || !GUILD_ID) {
      console.error('[AUTH] Missing token or guild ID');
      return false;
    }

    // Check if user is in guild with retry logic
    let member = null;
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
        const isRateLimit = error.response?.status === 429;
        if (isRateLimit && attempt < MAX_RETRIES) {
          const retryAfter = error.response?.headers?.['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt - 1);
          console.warn(`[ROLE VERIFY] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // For 404, user is not in guild
        if (error.response?.status === 404) {
          console.log('[AUTH] User not in guild');
          return false;
        }
        throw error;
      }
    }
    
    if (!member) {
      console.log('[AUTH] User not in guild');
      return false;
    }

    // If no specific role required, just verify they're in the guild
    if (!requiredRole) {
      return true;
    }

    // Verify user has required role (role names are in user.roles)
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
  const MAX_RETRIES = 5;
  const BASE_DELAY = 1000; // 1 second

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
      const isRateLimit = error.response?.status === 429;
      const isLastAttempt = attempt === MAX_RETRIES;

      if (isRateLimit && !isLastAttempt) {
        // Check for Retry-After header (Discord tells us exactly how long to wait)
        const retryAfter = error.response?.headers?.['retry-after'];
        let delay;

        if (retryAfter) {
          // Retry-After is in seconds, convert to ms
          delay = parseInt(retryAfter, 10) * 1000;
          console.warn(`[OAUTH] Rate limited, respecting Retry-After: ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`);
        } else {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          delay = BASE_DELAY * Math.pow(2, attempt - 1);
          console.warn(`[OAUTH] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error('[OAUTH ERROR]', error.response?.data || error.message);
      throw new Error('Failed to exchange OAuth code');
    }
  }
}

/**
 * Get user info from Discord
 * Includes retry logic for rate limits
 */
export async function getDiscordUserInfo(token) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

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
      const isRateLimit = error.response?.status === 429;
      if (isRateLimit && attempt < MAX_RETRIES) {
        const retryAfter = error.response?.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt - 1);
        console.warn(`[OAUTH] User fetch rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
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
        // If 404, user is not in guild - this is a logic error, not rate limit
        if (error.response?.status === 404) {
          throw new Error('User is not in the GLEECIN guild');
        }
        const isRateLimit = error.response?.status === 429;
        if (isRateLimit && attempt < MAX_RETRIES) {
          const retryAfter = error.response?.headers?.['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY * Math.pow(2, attempt - 1);
          console.warn(`[OAUTH] Member fetch rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
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
