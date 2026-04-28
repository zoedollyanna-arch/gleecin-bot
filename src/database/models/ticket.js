/**
 * Ticket Model
 * Unified ticket system for support and commission requests
 */

import { query } from '../connection.js';

/**
 * Initialize the tickets table
 */
export async function initTicketsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL UNIQUE,
      user_id VARCHAR(32) NOT NULL,
      user_tag VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('support', 'commission')),
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP,
      closed_by VARCHAR(32),
      closed_by_tag VARCHAR(100)
    )
  `;
  await query(createTableSQL);
  console.log('✅ [DB] Tickets table ready');
}

/**
 * Create a new ticket record
 */
export async function createTicket({ guildId, channelId, userId, userTag, type, description }) {
  const sql = `
    INSERT INTO tickets (guild_id, channel_id, user_id, user_tag, type, description)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await query(sql, [guildId, channelId, userId, userTag, type, description]);
  return result.rows[0];
}

/**
 * Get a ticket by channel ID
 */
export async function getTicketByChannel(channelId) {
  const sql = `SELECT * FROM tickets WHERE channel_id = $1`;
  const result = await query(sql, [channelId]);
  return result.rows[0] || null;
}

/**
 * Get all open tickets for a guild
 */
export async function getOpenTickets(guildId) {
  const sql = `
    SELECT * FROM tickets 
    WHERE guild_id = $1 AND status = 'open'
    ORDER BY created_at DESC
  `;
  const result = await query(sql, [guildId]);
  return result.rows;
}

/**
 * Close a ticket
 */
export async function closeTicket({ channelId, closedBy, closedByTag }) {
  const sql = `
    UPDATE tickets 
    SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $2, closed_by_tag = $3
    WHERE channel_id = $1
    RETURNING *
  `;
  const result = await query(sql, [channelId, closedBy, closedByTag]);
  return result.rows[0] || null;
}

/**
 * Reopen a ticket
 */
export async function reopenTicket(channelId) {
  const sql = `
    UPDATE tickets 
    SET status = 'open', closed_at = NULL, closed_by = NULL, closed_by_tag = NULL
    WHERE channel_id = $1
    RETURNING *
  `;
  const result = await query(sql, [channelId]);
  return result.rows[0] || null;
}

/**
 * Delete a ticket record (when channel is deleted)
 */
export async function deleteTicket(channelId) {
  const sql = `DELETE FROM tickets WHERE channel_id = $1 RETURNING *`;
  const result = await query(sql, [channelId]);
  return result.rows[0] || null;
}

/**
 * Get ticket statistics for a guild
 */
export async function getTicketStats(guildId) {
  const sql = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'open') as open_count,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
      COUNT(*) FILTER (WHERE type = 'support') as support_count,
      COUNT(*) FILTER (WHERE type = 'commission') as commission_count
    FROM tickets
    WHERE guild_id = $1
  `;
  const result = await query(sql, [guildId]);
  return result.rows[0];
}

