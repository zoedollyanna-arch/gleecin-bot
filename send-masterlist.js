import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_RESOURCES = '1498466258377638031';
const PDF = 'C:/Users/Shadow/Downloads/Coding_Agents_Masterlist.pdf';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    const attach = new AttachmentBuilder(PDF);
    const embed = new EmbedBuilder()
      .setTitle('🤖 NEW RESOURCE DROP · Coding Agent Masterlist! ✨')
      .setColor('#7dd3fc')
      .setDescription(
        'Heey Script Scholars! 🧠💻\n\nYour instructor hand-tested **every single tool** on this list so you don\u2019t have to guess! It\u2019s **the recommended coding agent masterlist** \u2014 perfect when you hit rate limits or get stuck debugging solo. 💾\n\n**Big idea:** a coding agent is the car 🚗, the AI model is the engine 🔧. Picking a strong model literally decides how fast you learn!'
      )
      .addFields(
        { name: '🥇 Claude Code', value: 'The strongest & most reliable coding agent right now. Terminal/VS Code/JetBrains, reads whole projects, fixes its own mistakes. Instructor recommended!', inline: false },
        { name: '🥈 GitHub Copilot', value: 'Beginner friendly, lives inside your editor, inline suggestions as you type. ~$10/mo (free tier / Student Pack often free!).', inline: false },
        { name: '🥉 Codex', value: 'OpenAI\u2019s agent-in included with certain ChatGPT plans. Great at background tasks & GitHub PRs.', inline: false },
        { name: '💻 Cursor', value: 'The AI-first editor (VS Code fork) \u2014 chat with your entire codebase, one-click AI edits, multi-model support.', inline: false },
        { name: '🟢 OpenCode', value: 'Free, open-source, terminal-based \u2014 plug in almost ANY model. A great *second tool* once you\u2019ve got the basics!', inline: false },
        { name: '🤖 Devin', value: 'Fully autonomous AI engineer for big goals. Treat it as a learning experiment and always review its work!', inline: false },
        { name: '🎯 Instructor Advice', value: 'Pick ONE tool & commit for a few projects. Subscribe to at least one paid agent if you can. Start with clear instructions, turn up the thinking level for hard problems, and ALWAYS read the code it writes!', inline: false }
      )
      .setFooter({ text: '💾 Save this PDF to your Desktop for quick reference! ~ Gleecin Scripting Academy' })
      .setTimestamp();

    await (await client.channels.fetch(CHANNEL_RESOURCES)).send({
      embeds: [embed],
      files: [attach]
    });
    console.log('✅ Masterlist dropped in #resources-and-curriculum');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.on('error', (e) => console.error('client error', e.message));
client.login(TOKEN);