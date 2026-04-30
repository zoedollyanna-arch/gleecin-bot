/**
 * Web Routes
 * Handles all main website pages and navigation
 */

import express from 'express';
import { isAuthenticated, getUserTier } from '../middleware/auth.js';
import { get } from '../db/database.js';

const router = express.Router();

/**
 * GET /
 * Homepage - Welcome page
 */
router.get('/', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;
  
  res.render('index', {
    user,
    isAuth,
    title: 'GLEECIN Academy - Premium Scripting Education'
  });
});

/**
 * GET /login
 * Login page with OAuth button
 */
router.get('/login', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/dashboard');
  }

  res.render('login', {
    error: req.query.error,
    title: 'Login to GLEECIN Academy'
  });
});

/**
 * GET /dashboard
 * Main dashboard - requires authentication
 * Admin → /admin, else → student dashboard
 */
router.get('/dashboard', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  
  try {
    const dbUser = await get('SELECT is_admin FROM users WHERE discord_id = $1', [user.discord_id || user.id]);
    
    if (dbUser?.is_admin) {
      return res.redirect('/admin');
    }
    
    const tier = getUserTier(user);
    res.render('dashboard', {
      user,
      tier,
      title: 'Dashboard - GLEECIN Academy'
    });
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error);
    res.status(500).render('error', { error: 'Dashboard load failed', user });
  }
});

/**
 * GET /academy
 * Academy overview page
 */
router.get('/academy', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;
  
  res.render('academy', {
    user,
    isAuth,
    pageCss: 'academy',
    title: 'Scripting Academy - GLEECIN'
  });
});

/**
 * GET /classes
 * Available classes listing - requires authentication
 */
router.get('/classes', isAuthenticated, (req, res) => {
  const user = req.session.user;
  const tier = getUserTier(user);

  res.render('classes', {
    user,
    tier,
    pageCss: 'classes',
    title: 'Class Catalog - GLEECIN Academy'
  });
});

/**
 * GET /class/:id
 * Individual class page - requires authentication
 */
router.get('/class/:id', isAuthenticated, (req, res) => {
  const user = req.session.user;
  const { id } = req.params;
  const tier = getUserTier(user);

  res.render('class-detail', {
    user,
    tier,
    classId: id,
    pageCss: 'class-detail',
    title: 'Class Details - GLEECIN Academy'
  });
});

/**
 * GET /learning
 * Interactive learning hub - requires authentication
 */
router.get('/learning', isAuthenticated, (req, res) => {
  const user = req.session.user;
  const tier = getUserTier(user);

  res.render('learning', {
    user,
    tier,
    pageCss: 'learning',
    title: 'Interactive Learning - GLEECIN Academy'
  });
});

/**
 * GET /scripts
 * Script library - public access
 */
router.get('/scripts', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;
  const tier = isAuth ? getUserTier(user) : 'free';

  res.render('scripts', {
    user,
    isAuth,
    tier,
    pageCss: 'scripts',
    title: 'Script Library - GLEECIN'
  });
});

/**
 * GET /scripts/:category
 * Scripts by category
 */
router.get('/scripts/:category', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;
  const tier = isAuth ? getUserTier(user) : 'free';
  const { category } = req.params;

  res.render('scripts-category', {
    user,
    isAuth,
    tier,
    category,
    pageCss: 'scripts',
    title: `${category} Scripts - GLEECIN`
  });
});

/**
 * GET /lessons
 * Lesson vault with videos - requires authentication
 */
router.get('/lessons', isAuthenticated, (req, res) => {
  const user = req.session.user;
  const tier = getUserTier(user);

  res.render('lessons', {
    user,
    tier,
    pageCss: 'lessons',
    title: 'Lesson Vault - GLEECIN Academy'
  });
});

/**
 * GET /tools
 * Tools and setup guides
 */
router.get('/tools', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  res.render('tools', {
    user,
    isAuth,
    pageCss: 'tools',
    title: 'Tools & Guides - GLEECIN'
  });
});

/**
 * GET /support
 * Help and support center
 */
router.get('/support', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  res.render('support', {
    user,
    isAuth,
    pageCss: 'support',
    title: 'Support Center - GLEECIN'
  });
});

/**
 * GET /schedule
 * Class schedule and announcements
 */
router.get('/schedule', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  res.render('schedule', {
    user,
    isAuth,
    pageCss: 'schedule',
    title: 'Schedule & Announcements - GLEECIN'
  });
});

/**
 * GET /marketplace
 * Marketplace storefront
 */
router.get('/marketplace', (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  res.render('marketplace', {
    user,
    isAuth,
    pageCss: 'marketplace',
    title: 'Marketplace - GLEECIN'
  });
});

/**
 * GET /certification
 * Certification and badges
 */
router.get('/certification', isAuthenticated, (req, res) => {
  const user = req.session.user;

  res.render('certification', {
    user,
    pageCss: 'certification',
    title: 'Certifications - GLEECIN Academy'
  });
});

/**
 * GET /profile
 * User profile page
 */
router.get('/profile', isAuthenticated, (req, res) => {
  const user = req.session.user;
  const tier = getUserTier(user);

  res.render('profile', {
    user,
    tier,
    pageCss: 'profile',
    title: 'My Profile - GLEECIN Academy'
  });
});

export default router;
