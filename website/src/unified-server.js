/**
 * GLEECIN Academy - Unified Server
 * Combines Website (Express) + Discord Bot
 * Runs both the academy portal and Discord bot in a single process
 */

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// Import Discord bot
import { Client, Collection, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';

// Import website routes and middleware
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webRoutes from './routes/web.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/student.js';
import { isAuthenticated, checkRole } from './middleware/auth.js';
import { initializeDatabase } from './db/database.js';
import { initDatabase as initBotDatabase } from '../../src/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 3000,
  SESSION_SECRET = 'your-secret-key-change-in-production',
  DISCORD_TOKEN,
  GUILD_ID
} = process.env;

const resolvedPort = Number(PORT);
const portValue = Number.isFinite(resolvedPort) ? resolvedPort : 3000;

// ============================================
// EXPRESS WEBSITE SETUP
// ============================================

const app = express();

// Trust proxy (required for secure cookies behind reverse proxy like Render)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- Routes ----
app.use('/auth', authRoutes);
app.use('/payment', paymentRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Health check endpoint (used by Render)
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'Academy Portal & Discord Bot Running',
    timestamp: new Date().toISOString(),
    bot: botStatus ? 'Connected' : 'Connecting...'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { user: req.session?.user });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).render('error', {
    error: err.message || 'Internal Server Error',
    user: req.session?.user
  });
});

// ============================================
// DISCORD BOT SETUP
// ============================================

let botStatus = false;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

bot.commands = new Collection();

// Load bot commands
async function loadBotCommands() {
  try {
    const commandsPath = path.join(__dirname, '..', '..', 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const commandModule = await import(`file://${filePath}`);
      const command = commandModule.default;

      if (!command?.data?.name || typeof command.execute !== 'function') {
        console.warn(`[BOT] ⚠️ Invalid command: ${file}`);
        continue;
      }
      bot.commands.set(command.data.name, command);
    }
    console.log(`[BOT] ✅ Loaded ${bot.commands.size} commands`);
  } catch (error) {
    console.error('[BOT] ❌ Failed to load commands:', error);
  }
}

// Load bot events
async function loadBotEvents() {
  try {
    const eventsPath = path.join(__dirname, '..', '..', 'src', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const eventModule = await import(`file://${filePath}`);
      const event = eventModule.default;

      if (event.once) {
        bot.once(event.name, (...args) => event.execute(...args, bot));
      } else {
        bot.on(event.name, (...args) => event.execute(...args, bot));
      }
    }
    console.log(`[BOT] ✅ Events loaded`);
  } catch (error) {
    console.error('[BOT] ❌ Failed to load events:', error);
  }
}

// Bot event handlers
bot.once(Events.ClientReady, (c) => {
  botStatus = true;
  console.log(`
╔══════════════════════════════════════════╗
║  ✅ Discord Bot Connected                ║
║  Logged in as: ${c.user.tag}
║  Guild: ${GUILD_ID}
╚══════════════════════════════════════════╝
  `);
});

bot.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = bot.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[BOT] Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[BOT] Error executing command ${interaction.commandName}:`, error);
      try {
        await interaction.reply({
          content: '❌ There was an error executing this command!',
          ephemeral: true
        });
      } catch (e) {
        console.error('Failed to send error response:', e);
      }
    }
  }
});

// ============================================
// STARTUP SEQUENCE
// ============================================

async function startup() {
  try {
    console.log('\n🚀 Starting GLEECIN Academy Portal + Discord Bot...\n');

    // Initialize websites database
    console.log('[WEBSITE] Initializing database...');
    await initializeDatabase();
    console.log('[WEBSITE] ✅ Database ready');

    // Initialize bot database connection
    console.log('[BOT] Initializing database...');
    await initBotDatabase();
    console.log('[BOT] ✅ Database ready');

    // Load bot commands and events
    console.log('[BOT] Loading commands...');
    await loadBotCommands();

    console.log('[BOT] Loading events...');
    await loadBotEvents();

    // Seed content needed for the Academy homepage counters.
    // These seed scripts are idempotent (upsert / ON CONFLICT / EXISTS checks).
    console.log('[CONTENT] Seeding academy lesson content...');
    await import('../seed-learning.js');
    console.log('[CONTENT] ✅ Academy lesson content seeded');

    if (process.env.NODE_ENV === 'production') {
      console.log('[CONTENT] Seeding production academy content...');
      await import('../seed-lsl-scripts.js');
      await import('../seed-challenges-quizzes.js');
      console.log('[CONTENT] ✅ Production academy content seeded');
    }

    // Start Express server on the platform-provided port only
    await new Promise((resolve, reject) => {
      const server = app.listen(portValue, () => {
        const publicUrl = process.env.PUBLIC_URL || `http${process.env.NODE_ENV === 'production' ? 's' : ''}://0.0.0.0:${portValue}`;
        console.log(`
╔══════════════════════════════════════════╗
║  GLEECIN Academy Portal                 ║
║  Website: ${publicUrl}${publicUrl.length < 40 ? ' '.repeat(40 - publicUrl.length) : ''}║
║  Status: RUNNING                         ║
╚══════════════════════════════════════════╝
        `);
        resolve(server);
      });
      server.on('error', reject);
    });

    // Login to Discord (runs in background after server is up)
    if (!DISCORD_TOKEN) {
      throw new Error('Missing DISCORD_TOKEN environment variable');
    }

    console.log('[BOT] Connecting to Discord...');
    await bot.login(DISCORD_TOKEN);

  } catch (error) {
    console.error('\n❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  try {
    if (bot.isReady()) {
      await bot.destroy();
      console.log('✅ Bot disconnected');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

// Start everything
startup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export default app;
