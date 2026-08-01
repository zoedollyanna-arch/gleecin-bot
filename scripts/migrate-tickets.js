/**
 * Apply the ticket schema migration on its own, without starting the bot.
 *
 * The same migration runs automatically at startup; this is for applying it
 * ahead of a deploy, or re-checking the schema after one.
 *
 *   node scripts/migrate-tickets.js
 */

import 'dotenv/config';
import { initTicketsTable } from '../src/database/models/ticket.js';
import { initSettingsTable } from '../src/database/models/settings.js';
import { query } from '../src/database/connection.js';

try {
  await initTicketsTable();
  await initSettingsTable();

  const cols = await query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'discord_tickets' ORDER BY ordinal_position`
  );
  console.log(`\ndiscord_tickets columns (${cols.rows.length}):`);
  console.log(`  ${cols.rows.map((r) => r.column_name).join(', ')}`);

  const constraint = await query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
     WHERE conname = 'discord_tickets_status_check'`
  );
  console.log(`\nstatus constraint: ${constraint.rows[0]?.def ?? '(none)'}`);

  const counts = await query(`SELECT COUNT(*)::int AS n FROM discord_tickets`);
  console.log(`existing ticket rows: ${counts.rows[0].n}`);

  const notes = await query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables
     WHERE table_name = 'discord_ticket_notes'`
  );
  console.log(`discord_ticket_notes present: ${notes.rows[0].n === 1}`);

  const typeCheck = await query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
     WHERE conname = 'discord_tickets_type_check'`
  );
  console.log(`type constraint: ${typeCheck.rows[0]?.def ?? '(none)'}`);

  const settings = await query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = 'guild_settings'`
  );
  console.log(`guild_settings present: ${settings.rows[0].n === 1}`);

  console.log('\n✅ Migration complete.');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
