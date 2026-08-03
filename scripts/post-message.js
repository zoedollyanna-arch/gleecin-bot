/**
 * Post a designed message into a channel by ID.
 *
 * Content lives in a JSON file rather than on the command line, because these
 * are long, formatted, and worth editing and re-posting rather than retyping:
 *
 *   { "content": "...", "embeds": [ { ...raw discord embed... } ] }
 *
 * Attachments passed with --file can be referenced inside an embed as
 * `attachment://<basename>` in image.url or thumbnail.url, which is how a local
 * logo ends up rendered inside the embed instead of dangling under it.
 *
 *   node scripts/post-message.js --channel 123 --message intro.json \
 *     --file "./gleecin.png" --file "./lifeline.png" --send
 *
 * Dry run unless --send. Pass --pin to pin the message after posting.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import { AttachmentBuilder, Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';

import { closeDatabase } from '../src/database/connection.js';

const args = { files: [], send: false, pin: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--send') args.send = true;
  else if (argv[i] === '--pin') args.pin = true;
  else if (argv[i] === '--file') args.files.push(argv[++i]);
  else if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
}

if (!args.channel || !args.message) {
  console.error('Usage: node scripts/post-message.js --channel <id> --message <file.json> [--file <img>] [--send] [--pin]');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(args.message, 'utf8'));
const embeds = (payload.embeds ?? []).map((e) => EmbedBuilder.from(e));

for (const f of args.files) {
  if (!fs.existsSync(f)) {
    console.error(`❌ Attachment not found: ${f}`);
    process.exit(1);
  }
}

// Discord silently drops an embed that breaks a limit, so check up front.
const LIMITS = { title: 256, description: 4096, fieldName: 256, fieldValue: 1024, fields: 25, total: 6000 };
let problems = 0;
payload.embeds?.forEach((e, i) => {
  const complain = (msg) => { console.error(`  embed ${i}: ${msg}`); problems++; };
  if ((e.title ?? '').length > LIMITS.title) complain('title too long');
  if ((e.description ?? '').length > LIMITS.description) complain('description too long');
  if ((e.fields ?? []).length > LIMITS.fields) complain('too many fields');
  (e.fields ?? []).forEach((f, j) => {
    if (f.name.length > LIMITS.fieldName) complain(`field ${j} name too long (${f.name.length})`);
    if (f.value.length > LIMITS.fieldValue) complain(`field ${j} value too long (${f.value.length})`);
  });
  const total =
    (e.title ?? '').length + (e.description ?? '').length + (e.footer?.text ?? '').length +
    (e.fields ?? []).reduce((n, f) => n + f.name.length + f.value.length, 0);
  if (total > LIMITS.total) complain(`total ${total} exceeds ${LIMITS.total}`);
});
if (problems) {
  console.error(`\n❌ ${problems} embed limit problem(s) — nothing sent.`);
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);

let exitCode = 0;
try {
  const channel = await client.channels.fetch(args.channel);
  if (!channel?.isTextBased()) throw new Error('Not a text channel.');

  console.log(`\n  Channel   #${channel.name}`);
  console.log(`  Embeds    ${embeds.length}`);
  payload.embeds?.forEach((e, i) =>
    console.log(`    ${i + 1}. ${e.title ?? '(no title)'} — ${(e.fields ?? []).length} fields`));
  console.log(`  Files     ${args.files.map((f) => path.basename(f)).join(', ') || 'none'}`);

  if (!args.send) {
    console.log('\n  Dry run. Re-run with --send.');
    process.exit(0);
  }

  const sent = await channel.send({
    content: payload.content ?? undefined,
    embeds,
    files: args.files.map((f) => new AttachmentBuilder(f, { name: path.basename(f) }))
  });

  if (args.pin) await sent.pin().catch((e) => console.warn(`  ⚠️ Could not pin: ${e.message}`));

  console.log(`  ✅ Posted to #${channel.name}`);
  console.log(`     https://discord.com/channels/${channel.guild.id}/${channel.id}/${sent.id}`);
} catch (error) {
  console.error('❌ Failed:', error.message);
  exitCode = 1;
} finally {
  await client.destroy();
  await closeDatabase().catch(() => {});
}

process.exit(exitCode);
