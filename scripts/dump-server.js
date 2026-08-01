/**
 * Read-only server introspection.
 *
 * Logs in with the existing bot token, walks GUILD_ID, and writes the full
 * category / channel / role layout to server-structure.json + .md so the
 * layout can be reviewed outside Discord. Makes no changes to the guild.
 *
 *   node scripts/dump-server.js
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

const { DISCORD_TOKEN, GUILD_ID } = process.env;

if (!DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN — copy .env.example to .env first');
if (!GUILD_ID) throw new Error('Missing GUILD_ID — copy .env.example to .env first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..');

const CHANNEL_KIND = {
  [ChannelType.GuildText]: 'text',
  [ChannelType.GuildVoice]: 'voice',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.GuildStageVoice]: 'stage',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildMedia]: 'media'
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();

    // @everyone denied ViewChannel is the marker for a staff-only / gated channel.
    const isPrivate = (channel) =>
      channel.permissionOverwrites?.cache
        ?.get(guild.roles.everyone.id)
        ?.deny?.has('ViewChannel') ?? false;

    const describe = (channel) => ({
      id: channel.id,
      name: channel.name,
      kind: CHANNEL_KIND[channel.type] ?? `unknown(${channel.type})`,
      position: channel.rawPosition,
      topic: channel.topic ?? null,
      nsfw: channel.nsfw ?? false,
      private: isPrivate(channel)
    });

    const all = [...channels.values()].filter(Boolean);
    const categories = all
      .filter((c) => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    const structure = {
      guild: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        createdAt: guild.createdAt.toISOString()
      },
      roles: [...roles.values()]
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          id: r.id,
          name: r.name,
          position: r.position,
          color: r.hexColor,
          managed: r.managed,
          memberCount: r.members.size
        })),
      categories: categories.map((cat) => ({
        ...describe(cat),
        channels: all
          .filter((c) => c.parentId === cat.id)
          .sort((a, b) => a.rawPosition - b.rawPosition)
          .map(describe)
      })),
      uncategorized: all
        .filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory)
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .map(describe)
    };

    fs.writeFileSync(
      path.join(outDir, 'server-structure.json'),
      JSON.stringify(structure, null, 2)
    );

    const lines = [
      `# ${structure.guild.name}`,
      ``,
      `- Guild ID: \`${structure.guild.id}\``,
      `- Members: ${structure.guild.memberCount}`,
      `- Categories: ${structure.categories.length}`,
      `- Roles: ${structure.roles.length}`,
      ``,
      `## Channels`,
      ``
    ];

    const renderChannel = (c) =>
      `  - ${c.private ? '🔒' : '  '} \`${c.name}\` — ${c.kind} — \`${c.id}\`` +
      (c.topic ? `\n      > ${c.topic.replace(/\n/g, ' ').slice(0, 120)}` : '');

    for (const cat of structure.categories) {
      lines.push(`### ${cat.name} — \`${cat.id}\``);
      lines.push(cat.channels.length ? cat.channels.map(renderChannel).join('\n') : '  _(empty)_');
      lines.push('');
    }

    if (structure.uncategorized.length) {
      lines.push(`### (no category)`);
      lines.push(structure.uncategorized.map(renderChannel).join('\n'));
      lines.push('');
    }

    lines.push(`## Roles`, ``);
    for (const r of structure.roles) {
      lines.push(`- \`${r.name}\` — \`${r.id}\` — ${r.memberCount} member(s)${r.managed ? ' _(bot-managed)_' : ''}`);
    }

    fs.writeFileSync(path.join(outDir, 'server-structure.md'), lines.join('\n'));

    console.log(`✅ ${structure.guild.name}`);
    console.log(`   ${structure.categories.length} categories, ${all.length} channels, ${structure.roles.length} roles`);
    console.log(`   → server-structure.json`);
    console.log(`   → server-structure.md`);
  } catch (error) {
    console.error('[DUMP ERROR]', error);
    process.exitCode = 1;
  } finally {
    await client.destroy();
  }
});

client.login(DISCORD_TOKEN);
