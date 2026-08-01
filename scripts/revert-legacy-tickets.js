/**
 * One-shot cleanup.
 *
 * An earlier version of the ticket migration targeted the legacy `tickets`
 * table before the bot's tables were namespaced to `discord_tickets`. It added
 * columns there and swapped the status CHECK constraint — which would have
 * rejected the 'open' status that table's own code writes. This puts it back.
 *
 * Safe to run more than once. Does not drop the table or any rows.
 *
 *   node scripts/revert-legacy-tickets.js
 */

import 'dotenv/config';
import { query } from '../src/database/connection.js';

const ADDED_COLUMNS = [
  'ticket_number', 'category', 'subject', 'budget', 'deadline',
  'reference_links', 'add_ons', 'priority', 'quote_amount', 'quote_note',
  'quoted_at', 'paid_at', 'delivered_at', 'awaiting_client', 'archived_at'
];

try {
  const rows = await query(`SELECT COUNT(*)::int AS n FROM tickets`);
  if (rows.rows[0].n > 0) {
    console.error(`❌ Refusing to alter a non-empty table (${rows.rows[0].n} rows). Inspect it first.`);
    process.exit(1);
  }

  for (const column of ADDED_COLUMNS) {
    await query(`ALTER TABLE tickets DROP COLUMN IF EXISTS ${column}`);
  }
  console.log(`✅ Dropped ${ADDED_COLUMNS.length} columns added in error.`);

  // Restore the constraint the legacy table's own code expects.
  await query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check`);
  await query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('open', 'closed'))
  `);
  console.log(`✅ Restored status constraint to ('open', 'closed').`);

  const cols = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'tickets' ORDER BY ordinal_position`
  );
  console.log(`\ntickets is back to: ${cols.rows.map((r) => r.column_name).join(', ')}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Revert failed:', error);
  process.exit(1);
}
