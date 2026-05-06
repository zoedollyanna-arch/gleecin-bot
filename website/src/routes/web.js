/**
 * Web Routes
 * Handles all main website pages and navigation
 */

import express from 'express';
import { isAuthenticated, getUserTier } from '../middleware/auth.js';
import { get, all } from '../db/database.js';

const router = express.Router();

function getProfileDisplayName(user, dbUser) {
  return dbUser?.username || user?.username || 'Member';
}

function getJoinedDate(user, dbUser) {
  const raw = dbUser?.joined_at || user?.joinedAt || user?.joined_at || user?.created_at;
  return raw ? new Date(raw) : null;
}

async function loadProfileData(user) {
  const discordId = user.discord_id || user.id;
  const dbUser = await get(
    `SELECT
        id,
        username,
        email,
        avatar_url,
        discord_id,
        tier,
        is_admin,
        roles,
        joined_at,
        last_login
     FROM users
     WHERE discord_id = $1 OR id = $2`,
    [discordId, user.id]
  );

  const userId = dbUser?.id || user.id;
  const [certificateCount, lessonCount, challengeCount, scriptCount, recentActivity] = await Promise.all([
    get('SELECT COUNT(*)::int AS count FROM certifications WHERE user_id = $1', [userId]),
    get('SELECT COUNT(*)::int AS count FROM lesson_progress WHERE user_id = $1 AND completed = true', [userId]),
    get('SELECT COUNT(*)::int AS count FROM challenge_submissions WHERE user_id = $1 AND status = $2', [userId, 'passed']),
    get('SELECT COUNT(*)::int AS count FROM script_downloads WHERE user_id = $1', [userId]),
    all(`
      SELECT activity_type, title, created_at
      FROM (
        SELECT 'lesson' AS activity_type, l.title, lp.completed_at AS created_at
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = $1 AND lp.completed = true
        UNION ALL
        SELECT 'challenge' AS activity_type, c.title, cs.submitted_at AS created_at
        FROM challenge_submissions cs
        JOIN challenges c ON c.id = cs.challenge_id
        WHERE cs.user_id = $1 AND cs.status IN ('passed', 'submitted')
        UNION ALL
        SELECT 'script' AS activity_type, s.title, sd.created_at
        FROM script_downloads sd
        JOIN scripts s ON s.id = sd.script_id
        WHERE sd.user_id = $1
      ) activity_feed
      ORDER BY created_at DESC NULLS LAST
      LIMIT 6
    `, [userId])
  ]);

  return {
    user: {
      ...user,
      username: getProfileDisplayName(user, dbUser),
      email: dbUser?.email || user.email || '',
      avatar_url: dbUser?.avatar_url || user.avatar_url || null,
      tier: dbUser?.tier || getUserTier(user),
      joined_at: dbUser?.joined_at || user.joinedAt || null,
      is_admin: dbUser?.is_admin || false
    },
    dbUser,
    stats: {
      lessonsCompleted: lessonCount?.count || 0,
      challengesSolved: challengeCount?.count || 0,
      certificatesEarned: certificateCount?.count || 0,
      scriptsDownloaded: scriptCount?.count || 0
    },
    recentActivity
  };
}

/**
 * GET /
 * Homepage - Welcome page
 */
router.get('/', async (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  try {
    const [stats, featuredScripts, featuredChallenges] = await Promise.all([
      get(`
        SELECT
          (SELECT COUNT(*)::int FROM scripts WHERE is_public = true) AS script_count,
          (SELECT COUNT(*)::int FROM challenges) AS challenge_count,
          (SELECT COUNT(*)::int FROM lessons) AS lesson_count,
          (SELECT COUNT(*)::int FROM certifications) AS certification_count
      `),
      all(`
        SELECT id, title, description, category, language, price_tier, explanation
        FROM scripts
        WHERE is_public = true
        ORDER BY created_at DESC
        LIMIT 3
      `),
      all(`
        SELECT id, title, description, difficulty, level, price_tier
        FROM challenges
        ORDER BY created_at DESC
        LIMIT 3
      `)
    ]);

    res.render('index', {
      user,
      isAuth,
      stats: stats || {
        script_count: 0,
        challenge_count: 0,
        lesson_count: 0,
        certification_count: 0
      },
      featuredScripts: Array.isArray(featuredScripts) ? featuredScripts : [],
      featuredChallenges: Array.isArray(featuredChallenges) ? featuredChallenges : [],
      title: 'GLEECIN Academy - Premium Scripting Education'
    });
  } catch (error) {
    console.error('[HOME ERROR]', error);
    res.status(500).render('error', { error: 'Homepage failed to load', user });
  }
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

function buildPreviewStudentUser() {
  return {
    id: 'preview-student',
    username: 'Preview Student',
    discord_id: 'preview-student',
    roles: [],
    is_preview: true
  };
}

/**
 * GET /student-preview
 * Public temporary preview of the student dashboard layout
 */
router.get('/student-preview', (req, res) => {
  res.render('dashboard', {
    user: buildPreviewStudentUser(),
    tier: 'free',
    previewMode: true,
    previewPublic: true,
    title: 'Student Preview - GLEECIN Academy'
  });
});

/**
 * GET /learning-preview
 * Public temporary preview of the learning system with a seeded student session
 */
router.get('/learning-preview', (req, res) => {
  req.session = req.session || {};
  req.session.user = buildPreviewStudentUser();
  req.session.save((error) => {
    if (error) {
      console.error('[LEARNING PREVIEW ERROR]', error);
      return res.status(500).render('error', { error: 'Failed to initialize preview session', user: null });
    }

    res.render('learning', {
      user: req.session.user,
      tier: 'free',
      previewMode: true,
      previewPublic: true,
      pageCss: 'learning',
      title: 'Interactive Learning Preview - GLEECIN Academy'
    });
  });
});

/**
 * GET /dashboard
 * Main dashboard - requires authentication
 * Admin → /admin, else → student dashboard
 */
router.get('/dashboard', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const preview = String(req.query.preview || '').toLowerCase();

  try {
    const dbUser = await get('SELECT is_admin FROM users WHERE discord_id = $1 OR id = $2', [user.discord_id || user.id, user.id]);
    const isAdminUser = !!dbUser?.is_admin;
    const isStudentPreview = isAdminUser && preview === 'student';

    if (isAdminUser && !isStudentPreview) {
      return res.redirect('/admin');
    }

    const tier = getUserTier(user);
    const userId = user.id;

    const [classesStats, lessonsStats, challengesStats, certsStats, scriptsStats] = await Promise.all([
      // Classes (accessible + enrolled)
      all(`
        SELECT
          COUNT(*)::int AS accessible_total,
          COALESCE(
            SUM(CASE WHEN e.status IN ('enrolled','completed') THEN 1 ELSE 0 END),
            0
          )::int AS enrolled_total
        FROM classes c
        LEFT JOIN enrollments e
          ON e.class_id = c.id AND e.user_id = $1
        WHERE c.price_tier = 'free'
           OR (c.price_tier = 'paid' AND ($2 IN ('paid','advanced')))
           OR (c.price_tier = 'advanced' AND $2 = 'advanced')
      `, [userId, tier]),

      // Lessons (accessible + completed)
      all(`
        SELECT
          COUNT(*)::int AS accessible_total,
          COALESCE(
            SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),
            0
          )::int AS completed_total
        FROM lessons l
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.user_id = $1
        WHERE l.price_tier = 'free'
           OR (l.price_tier = 'paid' AND ($2 IN ('paid','advanced')))
           OR (l.price_tier = 'advanced' AND $2 = 'advanced')
      `, [userId, tier]),

      // Challenges (accessible + passed)
      all(`
        SELECT
          COUNT(*)::int AS accessible_total,
          COALESCE(
            SUM(CASE WHEN cs.status = 'passed' THEN 1 ELSE 0 END),
            0
          )::int AS passed_total
        FROM challenges c
        LEFT JOIN challenge_submissions cs
          ON cs.challenge_id = c.id AND cs.user_id = $1
        WHERE c.price_tier = 'free'
           OR (c.price_tier = 'paid' AND ($2 IN ('paid','advanced')))
           OR (c.price_tier = 'advanced' AND $2 = 'advanced')
      `, [userId, tier]),

      get('SELECT COUNT(*)::int AS count FROM certifications WHERE user_id = $1', [userId]),
      get('SELECT COUNT(*)::int AS count FROM script_downloads WHERE user_id = $1', [userId])
    ]);

    const classesRow = classesStats?.[0] || { accessible_total: 0, enrolled_total: 0 };
    const lessonsRow = lessonsStats?.[0] || { accessible_total: 0, completed_total: 0 };
    const challengesRow = challengesStats?.[0] || { accessible_total: 0, passed_total: 0 };

    const safePercent = (completed, total) => (total > 0 ? Math.round((completed / total) * 100) : 0);

    res.render('dashboard', {
      user,
      tier,
      stats: {
        classesEnrolled: classesRow.enrolled_total || 0,
        classesAccessible: classesRow.accessible_total || 0,
        lessonsCompleted: lessonsRow.completed_total || 0,
        lessonsAccessible: lessonsRow.accessible_total || 0,
        challengesSolved: challengesRow.passed_total || 0,
        challengesAccessible: challengesRow.accessible_total || 0,
        certificatesEarned: certsStats?.count || 0,
        scriptsDownloaded: scriptsStats?.count || 0,
        lessonsProgressPercent: safePercent(lessonsRow.completed_total || 0, lessonsRow.accessible_total || 0),
        challengesProgressPercent: safePercent(challengesRow.passed_total || 0, challengesRow.accessible_total || 0),
        classesProgressPercent: safePercent(classesRow.enrolled_total || 0, classesRow.accessible_total || 0)
      },
      previewMode: isStudentPreview,
      previewPublic: false,
      title: isStudentPreview ? 'Student Preview - GLEECIN Academy' : 'Dashboard - GLEECIN Academy'
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

router.get('/prompts', isAuthenticated, (req, res) => {
  const user = req.session.user;

  res.render('prompts', {
    user,
    isAdmin: Boolean(user?.is_admin),
    pageCss: 'prompts',
    title: 'Prompts - GLEECIN Academy'
  });
});

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

router.get('/support', async (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;

  try {
    const articles = await all(`
      SELECT id, title, category, body
      FROM (
        SELECT id::text AS id, title, category, body
        FROM support_articles
        UNION ALL
        SELECT id, title, category, body
        FROM (
          VALUES
            ('getting-started-enrollment', 'How do I enroll in the Scripting Fundamentals class?', 'Getting Started', 'Open the Classes page, review the Scripting Fundamentals card, and select Enroll Now. Logged-in students will see Enrolled after the enrollment is saved.'),
            ('getting-started-client', 'What do I need before class starts?', 'Getting Started', 'Install the Virtual World Client, sign in to the academy, and make sure your code editor and debug console are ready before the session.'),
            ('technical-class', 'What if the class page or syllabus does not open?', 'Technical Issues', 'Refresh the page, confirm you are signed in, and open the enrollment letter from the Class Details page. If the PDF is missing, the server will return a clear error state.'),
            ('technical-client', 'What should I do if the client or guide does not load?', 'Technical Issues', 'Reload the page, verify your network connection, and open the linked guide again from the Tools or Support sections.'),
            ('billing-account', 'How do I update my account?', 'Account & Billing', 'Use the Discord login flow and profile page to keep account information current. Billing actions are handled by the payment workflow in the academy.'),
            ('billing-access', 'Why can’t I access paid content?', 'Account & Billing', 'Check your tier on the profile page and complete the payment workflow if your tier has not been upgraded yet.'),
            ('community-hub', 'Where can I find community resources?', 'Community', 'Use the Academy, Tools & Setup, and Prompts pages for guided learning, setup help, and coding agent starter prompts.'),
            ('community-policies', 'What are the community rules?', 'Community', 'Follow respectful communication, keep shared resources professional, and contact support if you need clarification about academy policies.')
      ) AS articles(id, title, category, body)
    `);

    res.render('support', {
      user,
      isAuth,
      pageCss: 'support',
      title: 'Support Center - GLEECIN',
      articles
    });
  } catch (error) {
    console.error('[SUPPORT PAGE ERROR]', error);
    res.render('support', {
      user,
      isAuth,
      pageCss: 'support',
      title: 'Support Center - GLEECIN',
      articles: []
    });
  }
});

router.get('/support/articles/:id', async (req, res) => {
  const user = req.session?.user;
  const isAuth = !!user;
  const { id } = req.params;

  const articleMap = {
    'getting-started-enrollment': {
      category: 'Getting Started',
      title: 'How do I enroll in the Scripting Fundamentals class?',
      body: 'Open the Classes page, review the Scripting Fundamentals card, and select Enroll Now. Logged-in students will see Enrolled after the enrollment is saved.'
    },
    'getting-started-client': {
      category: 'Getting Started',
      title: 'What do I need before class starts?',
      body: 'Install the Virtual World Client, sign in to the academy, and make sure your code editor and debug console are ready before the session.'
    },
    'technical-class': {
      category: 'Technical Issues',
      title: 'What if the class page or syllabus does not open?',
      body: 'Refresh the page, confirm you are signed in, and open the enrollment letter from the Class Details page. If the PDF is missing, the server will return a clear error state.'
    },
    'technical-client': {
      category: 'Technical Issues',
      title: 'What should I do if the client or guide does not load?',
      body: 'Reload the page, verify your network connection, and open the linked guide again from the Tools or Support sections.'
    },
    'billing-account': {
      category: 'Account & Billing',
      title: 'How do I update my account?',
      body: 'Use the Discord login flow and profile page to keep account information current. Billing actions are handled by the payment workflow in the academy.'
    },
    'billing-access': {
      category: 'Account & Billing',
      title: 'Why can’t I access paid content?',
      body: 'Check your tier on the profile page and complete the payment workflow if your tier has not been upgraded yet.'
    },
    'community-hub': {
      category: 'Community',
      title: 'Where can I find community resources?',
      body: 'Use the Academy, Tools & Setup, and Prompts pages for guided learning, setup help, and coding agent starter prompts.'
    },
    'community-policies': {
      category: 'Community',
      title: 'What are the community rules?',
      body: 'Follow respectful communication, keep shared resources professional, and contact support if you need clarification about academy policies.'
    }
  };

  const article = articleMap[id];
  if (!article) {
    return res.status(404).render('error', { error: 'Support article not found', user });
  }

  res.render('support', {
    user,
    isAuth,
    pageCss: 'support',
    title: `${article.title} - GLEECIN Support`,
    articles: [article],
    selectedArticleId: id
  });
});

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

router.get('/certification', isAuthenticated, (req, res) => {
  const user = req.session.user;

  res.render('certification', {
    user,
    pageCss: 'certification',
    title: 'Certifications - GLEECIN Academy'
  });
});

router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const profileData = await loadProfileData(req.session.user);
    res.render('profile', {
      ...profileData,
      pageCss: 'profile',
      title: 'My Profile - GLEECIN Academy'
    });
  } catch (error) {
    console.error('[PROFILE ERROR]', error);
    res.status(500).render('error', {
      error: 'Profile load failed',
      user: req.session.user
    });
  }
});

export default router;
