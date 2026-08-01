/**
 * Read-only check for anything the background jobs would announce on first run.
 *
 * The certificate job posts every certification not yet flagged `shared`, so a
 * pre-existing backlog would all arrive at once. Run this before enabling it.
 *
 *   node scripts/check-job-backlog.js
 */

import 'dotenv/config';
import { query } from '../src/database/connection.js';

const checks = [
  ['unshared certificates (would be announced)', `SELECT COUNT(*)::int AS n FROM certifications WHERE shared IS NOT TRUE`],
  ['certifications total', `SELECT COUNT(*)::int AS n FROM certifications`],
  ['published schedules from today', `SELECT COUNT(*)::int AS n FROM schedules WHERE published = true AND scheduled_date >= CURRENT_DATE`],
  ['schedules for tomorrow (next reminder)', `SELECT COUNT(*)::int AS n FROM schedules WHERE published = true AND scheduled_date = CURRENT_DATE + INTERVAL '1 day'`],
  ['open website support tickets', `SELECT COUNT(*)::int AS n FROM support_tickets WHERE status = 'open'`]
];

for (const [label, sql] of checks) {
  try {
    const result = await query(sql);
    console.log(`${String(result.rows[0].n).padStart(5)}  ${label}`);
  } catch (error) {
    console.log(`    ?  ${label} — ${error.message}`);
  }
}

process.exit(0);
