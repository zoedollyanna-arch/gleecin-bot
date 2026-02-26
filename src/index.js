import 'dotenv/config';
import express from 'express';
import { Client, Collection, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  DISCORD_TOKEN,
  GUILD_ID,
  PORT = 10000
} = process.env;

if (!DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// ---- Command loader (production pattern) ----
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(filePath);
  const command = commandModule.default;

  if (!command?.data?.name || typeof command.execute !== 'function') {
    console.warn(`[WARN] Command file invalid: ${file}`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// ---- Tiny web server (helps Render treat it as a web service) ----
const app = express();

app.get('/', (_req, res) => res.status(200).send('GLEECIN bot is online ✅'));
app.get('/health', (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => console.log(`[WEB] Listening on :${PORT}`));

// ---- Discord events ----
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: 'Command not found.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`[ERR] ${interaction.commandName}`, err);

    const errorEmbed = new EmbedBuilder()
      .setTitle('Something went wrong')
      .setDescription('Try again. If this keeps happening, open a support ticket.')
      .setTimestamp();

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
  }
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

await client.login(DISCORD_TOKEN);