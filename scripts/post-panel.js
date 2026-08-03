/**
 * Post an intake panel into a channel by ID, without needing to be in Discord.
 *
 *   node scripts/post-panel.js --panel student --channel 1498466444990484710
 *
 * Panels: student | class | support | commission
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

import {
  buildStudentPanel,
  buildClassPanel,
  buildSupportPanel,
  buildCommissionPanel
} from '../src/tickets/index.js';
import { closeDatabase } from '../src/database/connection.js';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
}

if (!args.channel || !args.panel) {
  console.error('Usage: node scripts/post-panel.js --panel <student|class|support|commission> --channel <id>');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);

let exitCode = 0;
try {
  const channel = await client.channels.fetch(args.channel);
  if (!channel?.isTextBased()) throw new Error('That channel is not a text channel.');

  const panel =
    args.panel === 'student'
      ? buildStudentPanel()
      : args.panel === 'class'
        ? buildClassPanel()
        : args.panel === 'commission'
          ? await buildCommissionPanel(channel.guild.id)
          : buildSupportPanel();

  const sent = await channel.send(panel);
  console.log(`✅ Posted the ${args.panel} panel to #${channel.name}`);
  console.log(`   https://discord.com/channels/${channel.guild.id}/${channel.id}/${sent.id}`);
} catch (error) {
  console.error('❌ Could not post the panel:', error.message);
  exitCode = 1;
} finally {
  await client.destroy();
  await closeDatabase().catch(() => {});
}

process.exit(exitCode);
