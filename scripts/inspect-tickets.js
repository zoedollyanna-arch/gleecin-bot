/**
 * Print the live shape of the tickets tables. Read-only diagnostic.
 *
 *   node scripts/inspect-tickets.js
 */

import 'dotenv/config';
import { query } from '../src/database/connection.js';

const tables = ['tickets', 'ticket_notes'];

for (const table of tables) {
  const cols = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table]
  );

  if (cols.rows.length === 0) {
    console.log(`\n${table}: does not exist`);
    continue;
  }

  console.log(`\n${table}:`);
  for (const r of cols.rows) {
    console.log(
      `  ${r.column_name.padEnd(20)} ${r.data_type.padEnd(28)} ` +
      `${r.is_nullable === 'NO' ? 'NOT NULL' : ''} ${r.column_default ? `default ${r.column_default}` : ''}`
    );
  }

  const cons = await query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conrelid = $1::regclass`,
    [table]
  );
  console.log('  constraints:');
  for (const c of cons.rows) console.log(`    ${c.conname}: ${c.def}`);

  const n = await query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  console.log(`  rows: ${n.rows[0].n}`);
}

process.exit(0);
