import { all, run } from './src/db/database.js';

const allowedTitles = new Set([
  'Touch Activated Light Toggle',
  'Proximity Greeting System',
  'Random Color Generator',
  'Simple Sit Teleporter',
  'Countdown Timer Display',
  'Private Chat Listener',
  'Object Rotation Controller',
  'Access Control Door',
  'Floating Text Updater',
  'Sound Trigger Pad',
  'Dialog Menu Controller',
  'Timed Auto Door System',
  'Multi-User Seat Tracker',
  'HTTP Data Fetcher',
  'Collision Damage System',
  'Animated Texture Cycler',
  'Object Follow Script',
  'Permission-Based Animation Trigger',
  'Inventory Giver System',
  'Region Time Display',
  'Dynamic NPC Wander System',
  'Secure Password Access Panel',
  'Vehicle Speed Limiter',
  'Multi-Step Quest Tracker',
  'Group-Only Access Checker',
  'Hovering Object Stabilizer',
  'Multi-Channel Chat Bridge',
  'Gesture Activated Object Toggle',
  'Region Welcome Notecard Giver',
  'Object Health System',
  'Teleport Pad with Cooldown',
  'Animated Color Pulse Effect',
  'Owner-Only Command Console',
  'Object Spin on Collision',
  'Dynamic Name Tag Display',
  'Object Self-Destruct Timer',
  'Weather Simulation Trigger',
  'Basic Door Open/Close Toggle',
  'Simple Visitor Counter',
  'Auto Object Resizer',
  'Touch to Glow Effect',
  'Random Teleport Within Region',
  'Simple Timer Reset Button',
  'Basic Sound Loop Player',
  'Touch-Based Object Hider',
  'Auto Rotation Reverser',
  'Basic Collision Counter',
  'Touch to Reset Script',
  'Basic Floating Animation',
  'Touch Sound Toggle',
  'Basic Object Bounce'
]);

async function cleanupLSLScripts() {
  const scripts = await all('SELECT id, title FROM scripts ORDER BY id ASC');
  const seen = new Set();
  const deleteIds = [];

  for (const script of scripts) {
    const title = String(script.title || '').trim();

    if (!allowedTitles.has(title) || seen.has(title)) {
      deleteIds.push(script.id);
      continue;
    }

    seen.add(title);
  }

  let deleted = 0;
  for (const id of deleteIds) {
    const result = await run('DELETE FROM scripts WHERE id = $1', [id]);
    deleted += result.changes || 0;
  }

  const remaining = await all('SELECT COUNT(*)::int AS count FROM scripts');
  console.log(`Deleted ${deleted} rows from scripts.`);
  console.log(`Remaining scripts: ${remaining?.[0]?.count ?? 0}`);
}

cleanupLSLScripts().catch((error) => {
  console.error('Failed to clean up LSL scripts:', error);
  process.exitCode = 1;
});
