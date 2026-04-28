import { query } from './connection.js';

export async function getUserByDiscordId(discordId) {
  const result = await query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
  return result.rows[0];
}

export async function createUser(discordId, username) {
  const result = await query(
    'INSERT INTO users (discord_id, username) VALUES ($1, $2) ON CONFLICT (discord_id) DO UPDATE SET username = $2 RETURNING *',
    [discordId, username]
  );
  return result.rows[0];
}

export async function updateUserMembership(discordId, isMember, isVisitor) {
  const result = await query(
    'UPDATE users SET is_member = $1, is_visitor = $2, updated_at = CURRENT_TIMESTAMP WHERE discord_id = $3 RETURNING *',
    [isMember, isVisitor, discordId]
  );
  return result.rows[0];
}

export async function createTicket(ticketId, userId, channelId, topic) {
  const result = await query(
    'INSERT INTO tickets (ticket_id, user_id, channel_id, topic) VALUES ($1, $2, $3, $4) RETURNING *',
    [ticketId, userId, channelId, topic]
  );
  return result.rows[0];
}

export async function closeTicket(ticketId, closedBy) {
  const result = await query(
    'UPDATE tickets SET status = $1, closed_at = CURRENT_TIMESTAMP, closed_by = $2 WHERE ticket_id = $3 RETURNING *',
    ['closed', closedBy, ticketId]
  );
  return result.rows[0];
}

export async function getUserTickets(userId) {
  const result = await query(
    'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function logWelcomeAction(userId, action, visitorRole = false, memberRole = false) {
  const result = await query(
    'INSERT INTO welcome_logs (user_id, action, visitor_role_assigned, member_role_assigned, access_granted_at) VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN CURRENT_TIMESTAMP END) RETURNING *',
    [userId, action, visitorRole, memberRole]
  );
  return result.rows[0];
}

export async function setChannelSettings(guildId, channelType, channelId, settings = {}) {
  const result = await query(
    `INSERT INTO channel_settings (guild_id, channel_type, channel_id, settings)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id, channel_type)
     DO UPDATE SET channel_id = $3, settings = $4, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [guildId, channelType, channelId, JSON.stringify(settings)]
  );
  return result.rows[0];
}

export async function getChannelSettings(guildId, channelType) {
  const result = await query(
    'SELECT * FROM channel_settings WHERE guild_id = $1 AND channel_type = $2',
    [guildId, channelType]
  );
  return result.rows[0];
}

export async function logCommunityAction(userId, channelId, action, messageContent = null) {
  const result = await query(
    'INSERT INTO community_logs (user_id, channel_id, action, message_content) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, channelId, action, messageContent]
  );
  return result.rows[0];
}

export async function getStats() {
  const users = await query('SELECT COUNT(*) FROM users');
  const tickets = await query('SELECT COUNT(*) FROM tickets');
  const openTickets = await query("SELECT COUNT(*) FROM tickets WHERE status = 'open'");
  const welcomeLogs = await query('SELECT COUNT(*) FROM welcome_logs');

  return {
    totalUsers: parseInt(users.rows[0].count),
    totalTickets: parseInt(tickets.rows[0].count),
    openTickets: parseInt(openTickets.rows[0].count),
    totalWelcomeLogs: parseInt(welcomeLogs.rows[0].count)
  };
}
