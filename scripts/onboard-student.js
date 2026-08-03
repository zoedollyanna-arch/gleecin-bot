/**
 * Onboard a student: create their Academy portal login, make sure they hold the
 * student role, and DM them the welcome message with their credentials.
 *
 * The portal (academy-starter) and this bot share one database, so the account
 * is written straight into `gleecin_users` with `discord_user_id` set — that
 * link is what lets the portal DM them about ticket replies later, and what
 * makes Discord sign-in work if it is ever switched back on.
 *
 * Dry run by default. Nothing is written and nothing is sent until you pass
 * --send, so you can read the exact message first.
 *
 *   node scripts/onboard-student.js --discord 1108185465271619666
 *   node scripts/onboard-student.js --discord 1108185465271619666 --send
 *   node scripts/onboard-student.js --discord <id> --username custom --send
 *   node scripts/onboard-student.js --discord <id> --rotate --send
 *
 * Flags:
 *   --discord <id>     Discord user ID. Required.
 *   --username <name>  Portal username. Defaults to their Discord username.
 *   --name <text>      Full name on the account. Defaults to their display name.
 *   --email <address>  Optional; the portal does not require one.
 *   --rotate           Reset the password of an account that already exists.
 *   --send             Actually write and send. Without it, this is a preview.
 *
 * The plaintext password is printed once and DMed once. It is never stored —
 * only the bcrypt hash goes in the database — so if the DM is lost, re-run with
 * --rotate rather than trying to recover it.
 */

import 'dotenv/config';
import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits
} from 'discord.js';

import { query, closeDatabase } from '../src/database/connection.js';

const PORTAL_URL = (process.env.PORTAL_BASE_URL || 'https://gleecin-academy-s7g9.onrender.com')
  .replace(/\/+$/, '');

// Same alphabet as the portal's own seeder: 0/O and 1/l/I are left out so the
// password survives being read off a phone screen and typed by hand.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SYMBOLS = '!@#$%^&*?';

function generatePassword(length = 16) {
  const pick = (set) => set[crypto.randomInt(set.length)];
  for (;;) {
    const chars = Array.from({ length: length - 2 }, () => pick(ALPHABET));
    chars.push(pick(SYMBOLS), pick('23456789'));
    // Fisher–Yates with a CSPRNG; sort(() => Math.random()) is not a shuffle.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const pwd = chars.join('');
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) return pwd;
  }
}

function parseArgs(argv) {
  const args = { send: false, rotate: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--send') args.send = true;
    else if (flag === '--rotate') args.rotate = true;
    else if (flag.startsWith('--')) args[flag.slice(2)] = argv[++i];
  }
  return args;
}

/** Discord usernames are already lowercase and dot/underscore-safe; be sure. */
function usernameFrom(discordUsername) {
  return discordUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') || null;
}

function buildWelcome({ displayName, username, password, rotated }) {
  const welcome = new EmbedBuilder()
    .setColor(0x67e8f9)
    .setTitle('🎀 Welcome to the Gleecin Scripting Academy!')
    .setDescription(
      `Hi **${displayName}** — you're in! 🥳\n\n` +
      'Thank you for trusting us to teach you. That genuinely means something: you picked ' +
      'us to help you learn something hard, and we do not take that lightly. 💜\n\n' +
      "You do not need to arrive knowing anything. Confused is the normal starting state, and " +
      'asking early is always the right move — that is exactly what your instructor is here for.'
    )
    .addFields(
      {
        name: '🎓 What happens next',
        value:
          '• Log in to the portal below and have a look around\n' +
          '• Check `/class schedule` for class times and key dates\n' +
          '• Say hi in the student channels — you are not the only beginner'
      },
      {
        name: '💬 When you get stuck',
        value:
          'Run `/class desk` anywhere in the server and pick what you need — ' +
          '💻 Code Review, 🔍 Debug Request, 📋 Assignment Review, ☕ Office Hours, and more. ' +
          'It opens a private channel with your instructor.\n\n' +
          '**Bring the broken script.** Half-finished and messy is perfect — that is the point.'
      }
    )
    .setFooter({ text: "We're so glad you're here. Now let's build something. ✨" })
    .setTimestamp();

  const credentials = new EmbedBuilder()
    .setColor(0xf4a7c8)
    .setTitle('🔑 Your Academy Portal Login')
    .setDescription(
      rotated
        ? 'Your password has been reset. Here are your current details:'
        : 'Your account is ready. Here are your details:'
    )
    .addFields(
      { name: '🌐 Portal', value: PORTAL_URL },
      { name: '👤 Username', value: `\`${username}\``, inline: true },
      { name: '🔒 Password', value: `\`${password}\``, inline: true },
      {
        name: '⚠️ Keep this safe',
        value:
          'This is the only copy — it is stored encrypted on our side, so nobody can read it ' +
          'back to you. Save it somewhere private and do not share it. Lost it? Just ask and ' +
          'we will issue a new one.'
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Open the Portal').setStyle(ButtonStyle.Link).setURL(PORTAL_URL)
  );

  return { embeds: [welcome, credentials], components: [row] };
}

// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
if (!args.discord) {
  console.error('Usage: node scripts/onboard-student.js --discord <user id> [--send]');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);

let exitCode = 0;
try {
  const user = await client.users.fetch(args.discord);
  if (user.bot) throw new Error('That Discord account is a bot.');

  const guild = process.env.GUILD_ID
    ? await client.guilds.fetch(process.env.GUILD_ID).catch(() => null)
    : null;
  const member = guild ? await guild.members.fetch(user.id).catch(() => null) : null;

  const username = args.username ?? usernameFrom(user.username);
  if (!username) throw new Error('Could not derive a username — pass --username explicitly.');

  const displayName = member?.displayName ?? user.displayName ?? user.username;
  const fullName = args.name ?? displayName;

  // Two ways an account can already exist: same portal username, or already
  // linked to this Discord ID under a different name. Check both before writing.
  const { rows: existing } = await query(
    `SELECT id, username, discord_user_id, password_hash
       FROM gleecin_users
      WHERE lower(username) = lower($1) OR discord_user_id = $2
      ORDER BY created_at ASC LIMIT 1`,
    [username, user.id]
  );
  const account = existing[0] ?? null;

  if (account && !args.rotate && account.password_hash) {
    console.error(
      `\n${username} already has an account (id ${account.id}). ` +
      'Re-run with --rotate to issue a new password, or pass a different --username.'
    );
    process.exit(1);
  }

  const password = generatePassword();
  const action = account ? 'password reset' : 'created';

  console.log('\n─── Onboarding preview ─────────────────────────────');
  console.log(`  Discord     ${user.tag} (${user.id})`);
  console.log(`  Display     ${displayName}`);
  console.log(`  Portal user ${username}`);
  console.log(`  Full name   ${fullName}`);
  console.log(`  Portal      ${PORTAL_URL}`);
  console.log(`  Account     ${action}`);
  console.log(`  Password    ${password}`);
  console.log(`  Student role ${
    member
      ? member.roles.cache.has(process.env.STUDENT_ROLE_ID) ? 'already held' : 'will be granted'
      : 'not in guild — skipped'
  }`);
  console.log('────────────────────────────────────────────────────');

  if (!args.send) {
    console.log('\nDry run. Nothing written, nothing sent. Re-run with --send to go ahead.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 12);

  if (account) {
    await query(
      `UPDATE gleecin_users SET
         password_hash = $1,
         full_name = COALESCE($2, full_name),
         email = COALESCE($3, email),
         discord_user_id = COALESCE(discord_user_id, $4),
         role = 'student',
         is_active = TRUE,
         deleted_at = NULL,
         failed_login_attempts = 0,
         locked_until = NULL,
         password_changed_at = NOW(),
         updated_at = NOW()
       WHERE id = $5`,
      [hash, fullName, args.email ?? null, user.id, account.id]
    );
  } else {
    await query(
      `INSERT INTO gleecin_users
         (username, email, full_name, password_hash, role, is_active,
          deleted_at, password_changed_at, discord_user_id)
       VALUES ($1, $2, $3, $4, 'student', TRUE, NULL, NOW(), $5)`,
      [username, args.email ?? null, fullName, hash, user.id]
    );
  }
  console.log(`✅ Portal account ${action}.`);

  // Best-effort: the account is the thing that matters, and the role is easy to
  // add by hand if the bot sits below it in the role list.
  const studentRoleId = process.env.STUDENT_ROLE_ID;
  if (member && studentRoleId && !member.roles.cache.has(studentRoleId)) {
    try {
      await member.roles.add(studentRoleId, 'Student onboarding');
      console.log('✅ Student role granted.');
    } catch (error) {
      console.warn(`⚠️  Could not grant the student role: ${error.message}`);
    }
  }

  try {
    await user.send(buildWelcome({ displayName, username, password, rotated: Boolean(account) }));
    console.log('✅ Welcome DM sent.');
  } catch (error) {
    // The account exists either way — say so loudly rather than failing silently,
    // because the password now only exists in this terminal output.
    console.error(`\n❌ Could not DM them (${error.message}).`);
    console.error('   Their DMs are probably closed. The account IS created — pass the');
    console.error('   credentials above along by hand, or ask them to open DMs and re-run');
    console.error('   with --rotate.');
    exitCode = 1;
  }
} catch (error) {
  console.error('❌ Onboarding failed:', error.message);
  exitCode = 1;
} finally {
  await client.destroy();
  await closeDatabase().catch(() => {});
}

process.exit(exitCode);
