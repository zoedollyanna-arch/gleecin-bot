import 'dotenv/config';
import express from 'express';
import { Client, Collection, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initDatabase } from './database/connection.js';

const {
  DISCORD_TOKEN,
  GUILD_ID,
  PORT = 10000
} = process.env;

// Initialize database on startup
await initDatabase();

if (!DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
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
  const commandModule = await import(pathToFileURL(filePath));
  const command = commandModule.default;

  if (!command?.data?.name || typeof command.execute !== 'function') {
    console.warn(`[WARN] Command file invalid: ${file}`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// ---- Event loader ----
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const eventModule = await import(pathToFileURL(filePath));
  const event = eventModule.default;

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
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
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
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
    return;
  }

  // Handle button interactions
  if (interaction.isButton()) {
    const buttonId = interaction.customId;
    
    try {
      // Import and delegate to event handler
      const eventsPath = path.join(__dirname, 'events');
      const interactionEventPath = path.join(eventsPath, 'interactionCreate.js');
      const interactionEvent = await import(pathToFileURL(interactionEventPath));
      
      if (interactionEvent.default?.handleButton) {
        await interactionEvent.default.handleButton(interaction, client);
      } else {
        await interaction.reply({
          content: 'This button action is not yet configured.',
          ephemeral: true
        }).catch(() => {});
      }
    } catch (err) {
      console.error(`[ERR] Button interaction ${buttonId}`, err);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred processing your request.',
          ephemeral: true
        }).catch(() => {});
      }
    }
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      const eventsPath = path.join(__dirname, 'events');
      const interactionEventPath = path.join(eventsPath, 'interactionCreate.js');
      const interactionEvent = await import(pathToFileURL(interactionEventPath));
      
      if (interactionEvent.default?.handleModal) {
        await interactionEvent.default.handleModal(interaction, client);
      }
    } catch (err) {
      console.error(`[ERR] Modal submission`, err);
    }
    return;
  }
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

await client.login(DISCORD_TOKEN);