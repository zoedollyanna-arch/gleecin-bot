import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import routes and middleware
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webRoutes from './routes/web.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';
import { isAuthenticated, checkRole } from './middleware/auth.js';
import { initializeDatabase } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 3000,
  SESSION_SECRET = 'your-secret-key-change-in-production'
} = process.env;

const app = express();

// Trust proxy (required for secure cookies behind reverse proxy like Render)
app.set('trust proxy', 1);

// ---- Middleware ----
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
// Authentication routes (no auth required)
app.use('/auth', authRoutes);

// Payment routes (for tier upgrades)
app.use('/payment', paymentRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// Web routes (includes both public and authenticated pages)
app.use('/', webRoutes);

// API routes
app.use('/api', apiRoutes);

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'Academy Portal Running', timestamp: new Date().toISOString() });
});

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).render('404', { user: req.user });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).render('error', {
    error: err.message || 'Internal Server Error',
    user: req.user
  });
});

// ---- Initialize Database and Start Server ----
async function start() {
  try {
    console.log('[DB] Initializing database...');
    await initializeDatabase();
    console.log('[DB] ✅ Database ready');

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   🎓 GLEECIN Academy Portal           ║
║   Running on http://localhost:${PORT}   ║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('[STARTUP ERROR]', error);
    process.exit(1);
  }
}

start();

export default app;
