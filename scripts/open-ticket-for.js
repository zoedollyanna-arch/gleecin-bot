/**
 * Pull someone into a ticket from the command line, and post an opening
 * message into it.
 *
 * Same code path as `/ticket open` in Discord — it calls openTicket() with
 * openedBy set, so the channel, the permissions, the ticket row, the numbering
 * and the staff controls are all identical. This exists for the cases where the
 * opening message is longer or more designed than you want to type into a
 * modal, or needs a file attached.
 *
 *   node scripts/open-ticket-for.js \
 *     --discord 1108185465271619666 \
 *     --category project_help \
 *     --subject "Build Your HUD - homework" \
 *     --message message.json \
 *     --file "assignment.pdf"
 *
 * Flags:
 *   --discord <id>     Who the ticket is for. Required.
 *   --category <value> A STUDENT_CATEGORIES value. Required.
 *   --type <type>      Ticket type. Defaults to student.
 *   --subject <text>   Ticket subject. Defaults to the category label.
 *   --details <text>   Body of the ticket embed.
 *   --message <path>   JSON file: { "content": "...", "embeds": [ ... ] }
 *                      Embeds are raw Discord embed objects.
 *   --file <path>      Attachment for the opening message. Repeatable.
 *   --send             Actually do it. Without this it is a dry run.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import { AttachmentBuilder, Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';

import { openTicket, STUDENT_CATEGORIES, getStudentCategory } from '../src/tickets/index.js';
import { closeDatabase } from '../src/database/connection.js';

const args = { files: [], send: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--send') args.send = true;
  else if (argv[i] === '--file') args.files.push(argv[++i]);
  else if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
}

if (!args.discord || !args.category) {
  console.error('Usage: node scripts/open-ticket-for.js --discord <id> --category <value> [--send]');
  console.error('Categories:', STUDENT_CATEGORIES.map((c) => c.value).join(', '));
  process.exit(1);
}

const type = args.type ?? 'student';
const label = getStudentCategory(args.category)?.label ?? args.category;

for (const f of args.files) {
  if (!fs.existsSync(f)) {
    console.error(`❌ Attachment not found: ${f}`);
    process.exit(1);
  }
}

let message = null;
if (args.message) {
  message = JSON.parse(fs.readFileSync(args.message, 'utf8'));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);

let exitCode = 0;
try {
  const user = await client.users.fetch(args.discord);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch(user.id); // fail early if they are not in the server

  console.log('\n─── Ticket preview ─────────────────────────────────');
  console.log(`  For        ${user.tag} (${user.id})`);
  console.log(`  Type       ${type}`);
  console.log(`  Category   ${args.category}  (${label})`);
  console.log(`  Subject    ${args.subject ?? label}`);
  console.log(`  Message    ${message ? `${message.embeds?.length ?? 0} embed(s)` : 'none'}`);
  console.log(`  Files      ${args.files.map((f) => path.basename(f)).join(', ') || 'none'}`);
  console.log('────────────────────────────────────────────────────');

  if (!args.send) {
    console.log('\nDry run. Nothing opened, nothing sent. Re-run with --send.');
    process.exit(0);
  }

  const result = await openTicket({
    guild,
    user,
    type,
    openedBy: client.user.id,
    force: true,
    fields: {
      category: args.category,
      subject: args.subject ?? label,
      description: args.details ?? `${label} ticket opened by your instructor.`
    }
  });

  if (result.duplicate) {
    console.log(`⚠️  Already has an open ${label} ticket: #${result.ticket.ticket_number}`);
    console.log(`   https://discord.com/channels/${guild.id}/${result.ticket.channel_id}`);
    process.exit(0);
  }

  console.log(`✅ Opened ticket #${result.ticket.ticket_number} → #${result.channel.name}`);

  if (message) {
    await result.channel.send({
      content: message.content ?? undefined,
      embeds: (message.embeds ?? []).map((e) => EmbedBuilder.from(e)),
      files: args.files.map((f) => new AttachmentBuilder(f, { name: path.basename(f) }))
    });
    console.log('✅ Opening message posted.');
  }

  console.log(`   https://discord.com/channels/${guild.id}/${result.channel.id}`);
} catch (error) {
  console.error('❌ Failed:', error.message);
  exitCode = 1;
} finally {
  await client.destroy();
  await closeDatabase().catch(() => {});
}

process.exit(exitCode);
