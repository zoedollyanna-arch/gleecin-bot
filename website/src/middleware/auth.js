/**
 * Authentication Middleware
 * Handles Discord OAuth verification and role-based access
 */

import axios from 'axios';

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GUILD_ID } = process.env;

/**
 * Middleware: Check if user is authenticated
 */
export async function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' }).end();
  }
  
  // Verify token is still valid, refresh if needed
  try {
    await verifyDiscordToken(req.session.user.token);
    next();
  } catch (error) {
    // Token expired, try to refresh it
    try {
      const refreshedToken = await refreshDiscordToken(req.session.user.refreshToken);
      req.session.user.token = refreshedToken.access_token;
      req.session.user.refreshToken = refreshedToken.refresh_token;
      next();
    } catch (refreshError) {
      console.error('[AUTH REFRESH ERROR]', refreshError.message);
      req.session.destroy();
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
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
 */
export async function verifyDiscordToken(token) {
  try {
    const response = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Invalid Discord token');
  }
}

/**
 * Refresh Discord OAuth token using refresh token
 */
export async function refreshDiscordToken(refreshToken) {
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
    console.error('[TOKEN REFRESH ERROR]', error.response?.data || error.message);
    throw new Error('Failed to refresh Discord token');
  }
}

/**
 * Verify user is in guild and has correct role
 */
export async function verifyUserRole(user, requiredRole) {
  try {
    if (!user.token || !GUILD_ID) {
      console.error('[AUTH] Missing token or guild ID');
      return false;
    }

    // Check if user is in guild
    const memberResponse = await axios.get(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      }
    );

    const member = memberResponse.data;
    
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
export function getDiscordOAuthURL(redirectUri) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds.members.read',
    prompt: 'none'
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange Discord OAuth code for token
 */
export async function exchangeOAuthCode(code, redirectUri) {
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
    console.error('[OAUTH ERROR]', error.response?.data || error.message);
    throw new Error('Failed to exchange OAuth code');
  }
}

/**
 * Get user info from Discord
 */
export async function getDiscordUserInfo(token) {
  try {
    const [userData, guildMemberData] = await Promise.all([
      axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      GUILD_ID ? axios.get(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).catch(() => null) : Promise.resolve(null)
    ]);

    const user = userData.data;
    const member = guildMemberData?.data;

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
  } catch (error) {
    console.error('[USER INFO ERROR]', error.message);
    throw error;
  }
}
