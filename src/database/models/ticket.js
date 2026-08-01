/**
 * Ticket Model
 * Support and commission tickets, plus staff-only notes.
 */

import { query } from '../connection.js';

/** Lifecycle states. `new` is where every ticket starts. */
export const TICKET_STATUSES = [
  'new',
  'quoted',
  'paid',
  'in_progress',
  'review',
  'delivered',
  'closed'
];

export const STATUS_LABELS = {
  new: '🆕 New',
  quoted: '💰 Quoted',
  paid: '✅ Paid',
  in_progress: '🔨 In Progress',
  review: '👀 In Review',
  delivered: '📦 Delivered',
  closed: '🔒 Closed'
};

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/** Commissions, customer support, and scripting-class applications. */
export const TICKET_TYPES = ['support', 'commission', 'class'];

export const PRIORITY_LABELS = {
  low: '⬇️ Low',
  normal: '➡️ Normal',
  high: '⬆️ High',
  urgent: '🚨 Urgent'
};

/**
 * Create the Discord ticket tables.
 *
 * Namespaced as `discord_tickets` rather than `tickets`: the database already
 * carries an orphaned `tickets` table from an older schema (ticket_id/topic,
 * written only by the now-unused src/database/utils.js), and the website owns
 * `support_tickets`. Sharing a name with either would mean fighting over the
 * same columns.
 */
export async function initTicketsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS discord_tickets (
      id SERIAL PRIMARY KEY,
      ticket_number INTEGER,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL UNIQUE,
      user_id VARCHAR(32) NOT NULL,
      user_tag VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(40),
      subject TEXT,
      description TEXT,
      budget TEXT,
      deadline TEXT,
      reference_links TEXT,
      add_ons TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      priority VARCHAR(10) NOT NULL DEFAULT 'normal',
      quote_amount INTEGER,
      quote_note TEXT,
      quoted_at TIMESTAMP,
      paid_at TIMESTAMP,
      delivered_at TIMESTAMP,
      awaiting_client BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP,
      closed_by VARCHAR(32),
      closed_by_tag VARCHAR(100),
      archived_at TIMESTAMP,
      CONSTRAINT discord_tickets_status_check
        CHECK (status IN (${TICKET_STATUSES.map((s) => `'${s}'`).join(', ')}))
    )
  `);

  // Added after the table shipped; ALTER keeps existing deployments in step.
  const laterColumns = [
    ['revisions_used', 'INTEGER NOT NULL DEFAULT 0'],
    ['revisions_allowed', 'INTEGER'],
    ['last_activity_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ['last_nudge_at', 'TIMESTAMP']
  ];
  for (const [name, type] of laterColumns) {
    await query(`ALTER TABLE discord_tickets ADD COLUMN IF NOT EXISTS ${name} ${type}`);
  }

  // Rebuilt rather than declared inline: 'class' was added after the original
  // constraint shipped with only support/commission.
  await query(`ALTER TABLE discord_tickets DROP CONSTRAINT IF EXISTS discord_tickets_type_check`);
  await query(`
    ALTER TABLE discord_tickets ADD CONSTRAINT discord_tickets_type_check
    CHECK (type IN (${TICKET_TYPES.map((t) => `'${t}'`).join(', ')}))
  `);

  // Transcripts live in their own table: they are large, written once, and read
  // rarely, so keeping them out of discord_tickets keeps the common queries
  // cheap. This is the durable record — the Discord channel is deleted on close.
  await query(`
    CREATE TABLE IF NOT EXISTS discord_ticket_transcripts (
      ticket_id INTEGER PRIMARY KEY REFERENCES discord_tickets(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS discord_ticket_notes (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES discord_tickets(id) ON DELETE CASCADE,
      author_id VARCHAR(32) NOT NULL,
      author_tag VARCHAR(100) NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_discord_tickets_guild_status ON discord_tickets (guild_id, status)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_discord_tickets_user ON discord_tickets (guild_id, user_id)`
  );

  console.log('✅ [DB] Discord ticket tables ready');
}

/**
 * Next per-guild ticket number.
 *
 * Exported so the caller can name the channel correctly on creation: Discord
 * rate-limits channel renames to 2 per 10 minutes, so creating under a
 * placeholder name and renaming afterwards wastes half that budget.
 */
export async function peekNextTicketNumber(guildId) {
  const result = await query(
    `SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next FROM discord_tickets WHERE guild_id = $1`,
    [guildId]
  );
  return result.rows[0].next;
}

export async function createTicket({
  guildId,
  channelId,
  userId,
  userTag,
  type,
  category = null,
  subject = null,
  description = null,
  budget = null,
  deadline = null,
  referenceLinks = null,
  addOns = null,
  ticketNumber = null
}) {
  const number = ticketNumber ?? (await peekNextTicketNumber(guildId));
  const result = await query(
    `INSERT INTO discord_tickets (
       guild_id, channel_id, user_id, user_tag, type, category,
       subject, description, budget, deadline, reference_links, add_ons,
       ticket_number, status
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'new')
     RETURNING *`,
    [
      guildId, channelId, userId, userTag, type, category,
      subject, description, budget, deadline, referenceLinks, addOns,
      number
    ]
  );
  return result.rows[0];
}

export async function getTicketByChannel(channelId) {
  const result = await query(`SELECT * FROM discord_tickets WHERE channel_id = $1`, [channelId]);
  return result.rows[0] || null;
}

/**
 * An unarchived, unclosed ticket of this type already owned by the user.
 * Used to stop one person opening ten channels.
 */
export async function findOpenTicketForUser(guildId, userId, type) {
  const result = await query(
    `SELECT * FROM discord_tickets
     WHERE guild_id = $1 AND user_id = $2 AND type = $3
       AND status <> 'closed' AND archived_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [guildId, userId, type]
  );
  return result.rows[0] || null;
}

export async function getOpenTickets(guildId, { type = null } = {}) {
  const params = [guildId];
  let sql = `SELECT * FROM discord_tickets WHERE guild_id = $1 AND status <> 'closed' AND archived_at IS NULL`;
  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }
  sql += ` ORDER BY
    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    created_at ASC`;
  const result = await query(sql, params);
  return result.rows;
}

export async function getTicketsForUser(guildId, userId, { type = null } = {}) {
  const params = [guildId, userId];
  let sql = `SELECT * FROM discord_tickets WHERE guild_id = $1 AND user_id = $2`;
  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }
  sql += ` ORDER BY created_at DESC LIMIT 25`;
  const result = await query(sql, params);
  return result.rows;
}

export async function setStatus(channelId, status) {
  const stamps = {
    paid: 'paid_at',
    delivered: 'delivered_at'
  };
  const stampColumn = stamps[status];
  const sql = `
    UPDATE discord_tickets
    SET status = $2${stampColumn ? `, ${stampColumn} = COALESCE(${stampColumn}, CURRENT_TIMESTAMP)` : ''}
    WHERE channel_id = $1
    RETURNING *`;
  const result = await query(sql, [channelId, status]);
  return result.rows[0] || null;
}

export async function setPriority(channelId, priority) {
  const result = await query(
    `UPDATE discord_tickets SET priority = $2 WHERE channel_id = $1 RETURNING *`,
    [channelId, priority]
  );
  return result.rows[0] || null;
}

export async function setQuote(channelId, { amount, note }) {
  const result = await query(
    `UPDATE discord_tickets
     SET quote_amount = $2, quote_note = $3, quoted_at = CURRENT_TIMESTAMP,
         status = CASE WHEN status = 'new' THEN 'quoted' ELSE status END
     WHERE channel_id = $1
     RETURNING *`,
    [channelId, amount, note]
  );
  return result.rows[0] || null;
}

export async function setAwaitingClient(channelId, awaiting) {
  const result = await query(
    `UPDATE discord_tickets SET awaiting_client = $2 WHERE channel_id = $1 RETURNING *`,
    [channelId, awaiting]
  );
  return result.rows[0] || null;
}

/**
 * Close and archive. Deliberately keeps the row — commission history is
 * business record, not scratch data.
 */
export async function closeTicket({ channelId, closedBy, closedByTag }) {
  const result = await query(
    `UPDATE discord_tickets
     SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
         closed_by = $2, closed_by_tag = $3, archived_at = CURRENT_TIMESTAMP
     WHERE channel_id = $1
     RETURNING *`,
    [channelId, closedBy, closedByTag]
  );
  return result.rows[0] || null;
}

export async function reopenTicket(channelId) {
  const result = await query(
    `UPDATE discord_tickets
     SET status = 'new', closed_at = NULL, closed_by = NULL,
         closed_by_tag = NULL, archived_at = NULL
     WHERE channel_id = $1
     RETURNING *`,
    [channelId]
  );
  return result.rows[0] || null;
}

export async function saveTranscript({ ticketId, body, messageCount }) {
  const result = await query(
    `INSERT INTO discord_ticket_transcripts (ticket_id, body, message_count)
     VALUES ($1, $2, $3)
     ON CONFLICT (ticket_id) DO UPDATE
       SET body = $2, message_count = $3, saved_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [ticketId, body, messageCount]
  );
  return result.rows[0];
}

/** Pull a saved transcript back by its per-guild ticket number. */
export async function getTranscriptByNumber(guildId, ticketNumber) {
  const result = await query(
    `SELECT t.*, tr.body, tr.message_count, tr.saved_at
     FROM discord_tickets t
     LEFT JOIN discord_ticket_transcripts tr ON tr.ticket_id = t.id
     WHERE t.guild_id = $1 AND t.ticket_number = $2`,
    [guildId, ticketNumber]
  );
  return result.rows[0] || null;
}

/** Closed tickets, for browsing history now that channels don't persist. */
export async function getClosedTickets(guildId, { userId = null, type = null, limit = 20 } = {}) {
  const params = [guildId];
  let sql = `
    SELECT t.*, (tr.ticket_id IS NOT NULL) AS has_transcript
    FROM discord_tickets t
    LEFT JOIN discord_ticket_transcripts tr ON tr.ticket_id = t.id
    WHERE t.guild_id = $1 AND t.status = 'closed'`;

  if (userId) {
    params.push(userId);
    sql += ` AND t.user_id = $${params.length}`;
  }
  if (type) {
    params.push(type);
    sql += ` AND t.type = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY t.closed_at DESC NULLS LAST LIMIT $${params.length}`;

  const result = await query(sql, params);
  return result.rows;
}

export async function addNote({ ticketId, authorId, authorTag, note }) {
  const result = await query(
    `INSERT INTO discord_ticket_notes (ticket_id, author_id, author_tag, note)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [ticketId, authorId, authorTag, note]
  );
  return result.rows[0];
}

export async function getNotes(ticketId) {
  const result = await query(
    `SELECT * FROM discord_ticket_notes WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId]
  );
  return result.rows;
}

/** How many commissions are currently occupying a slot. */
export async function countActiveCommissions(guildId) {
  const result = await query(
    `SELECT COUNT(*)::int AS n FROM discord_tickets
     WHERE guild_id = $1 AND type = 'commission'
       AND status NOT IN ('closed', 'delivered') AND archived_at IS NULL`,
    [guildId]
  );
  return result.rows[0].n;
}

export async function touchActivity(channelId) {
  await query(
    `UPDATE discord_tickets SET last_activity_at = CURRENT_TIMESTAMP, last_nudge_at = NULL
     WHERE channel_id = $1`,
    [channelId]
  );
}

export async function addRevision(channelId, { allowed = null } = {}) {
  const result = await query(
    `UPDATE discord_tickets
     SET revisions_used = revisions_used + 1,
         revisions_allowed = COALESCE($2, revisions_allowed)
     WHERE channel_id = $1
     RETURNING *`,
    [channelId, allowed]
  );
  return result.rows[0] || null;
}

export async function setRevisionsAllowed(channelId, allowed) {
  const result = await query(
    `UPDATE discord_tickets SET revisions_allowed = $2 WHERE channel_id = $1 RETURNING *`,
    [channelId, allowed]
  );
  return result.rows[0] || null;
}

export async function markNudged(channelId) {
  await query(
    `UPDATE discord_tickets SET last_nudge_at = CURRENT_TIMESTAMP WHERE channel_id = $1`,
    [channelId]
  );
}

/**
 * Tickets with no activity for `days`, for the stale sweep.
 *
 * `stage` picks which half of the sweep: 'nudge' finds ones never nudged,
 * 'archive' finds ones already nudged and still silent.
 */
export async function findStaleTickets({ days, stage }) {
  const nudgeClause =
    stage === 'nudge'
      ? 'AND last_nudge_at IS NULL'
      : "AND last_nudge_at IS NOT NULL AND last_nudge_at < NOW() - ($1 || ' days')::interval";

  const result = await query(
    `SELECT * FROM discord_tickets
     WHERE status <> 'closed' AND archived_at IS NULL
       AND last_activity_at < NOW() - ($1 || ' days')::interval
       ${nudgeClause}
     ORDER BY last_activity_at ASC
     LIMIT 25`,
    [String(days)]
  );
  return result.rows;
}

export async function getTicketStats(guildId) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status <> 'closed') AS open_count,
       COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
       COUNT(*) FILTER (WHERE type = 'support') AS support_count,
       COUNT(*) FILTER (WHERE type = 'commission') AS commission_count,
       COUNT(*) FILTER (WHERE awaiting_client) AS awaiting_count,
       COALESCE(SUM(quote_amount) FILTER (WHERE status = 'paid' OR paid_at IS NOT NULL), 0) AS paid_total,
       COALESCE(SUM(quote_amount) FILTER (WHERE status NOT IN ('closed') AND paid_at IS NULL), 0) AS pipeline_total
     FROM discord_tickets WHERE guild_id = $1`,
    [guildId]
  );
  return result.rows[0];
}
