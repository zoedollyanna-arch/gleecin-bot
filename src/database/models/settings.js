/**
 * Per-guild operational settings.
 *
 * Currently just commission intake control — how many jobs can be open at once
 * and whether the queue is accepting at all.
 */

import { query } from '../connection.js';

export async function initSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(32) PRIMARY KEY,
      commission_slots INTEGER,
      commissions_open BOOLEAN NOT NULL DEFAULT TRUE,
      closed_message TEXT,
      digest_channel_id VARCHAR(32),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ [DB] Guild settings table ready');
}

const DEFAULTS = {
  commission_slots: null, // null = unlimited
  commissions_open: true,
  closed_message: null,
  digest_channel_id: null
};

export async function getSettings(guildId) {
  const result = await query(`SELECT * FROM guild_settings WHERE guild_id = $1`, [guildId]);
  return { guild_id: guildId, ...DEFAULTS, ...(result.rows[0] ?? {}) };
}

export async function updateSettings(guildId, patch) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return getSettings(guildId);

  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
  const updates = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

  const result = await query(
    `INSERT INTO guild_settings (guild_id, ${columns})
     VALUES ($1, ${placeholders})
     ON CONFLICT (guild_id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [guildId, ...keys.map((k) => patch[k])]
  );
  return result.rows[0];
}
