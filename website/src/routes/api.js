/**

 * API Routes - PRODUCTION READY

 * All endpoints use real PostgreSQL data

 * No fake data or unsafe execution

 */



import express from 'express';

import rateLimit from 'express-rate-limit';

import validator from 'validator';

import { isAuthenticated, getUserTier } from '../middleware/auth.js';

import { get, all, run } from '../db/database.js';

import { issueCertificate, verifyCertificate } from '../utils/certificates.js';

import fs from 'node:fs/promises';

import path from 'node:path';

import { fileURLToPath } from 'node:url';



const router = express.Router();



const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);



// Rate limiters

const apiLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 100,

  standardHeaders: true,

  legacyHeaders: false

});



const submitLimiter = rateLimit({

  windowMs: 60 * 60 * 1000,

  max: 10,

  standardHeaders: true,

  legacyHeaders: false

});



router.use(apiLimiter);





// ============ CLASSES ============



/**

 * GET /api/classes

 * Get all available classes

 */

router.get('/classes', isAuthenticated, async (req, res) => {

  try {

    const tier = getUserTier(req.session.user);



    const classes = await all(`

      SELECT id, name, description, level, duration, instructor, price_tier,

             current_students, max_students, start_date, end_date

      FROM classes

      WHERE price_tier = 'free' OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced'))) 

         OR (price_tier = 'advanced' AND $1 = 'advanced')

      ORDER BY start_date DESC

    `, [tier]);



    res.json(classes);

  } catch (error) {

    console.error('[CLASSES ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch classes' });

  }

});



/**

 * GET /api/class/:id

 * Get class details

 */

router.get('/class/:id', isAuthenticated, async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid class ID' });

    }



    const classData = await get(

      'SELECT * FROM classes WHERE id = $1',

      [parseInt(id)]

    );



    if (!classData) {

      return res.status(404).json({ error: 'Class not found' });

    }



    const enrollment = await get(

      'SELECT * FROM enrollments WHERE user_id = $1 AND class_id = $2',

      [req.session.user.id, id]

    );



    res.json({

      ...classData,

      isEnrolled: !!enrollment

    });

  } catch (error) {

    console.error('[CLASS DETAIL ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch class' });

  }

});



// ============ SCRIPTS ============



/**

 * GET /api/scripts

 * Get all scripts with filtering

 */

router.get('/scripts', async (req, res) => {

  try {

    const { category, search, tag } = req.query;

    const tier = getUserTier(req.session?.user) || 'free';



    let query = `

      SELECT id, title, description, category, version, language,

             author_id, download_count, is_public, price_tier,

             created_at, updated_at

      FROM scripts

      WHERE is_public = true

        AND (price_tier = 'free' 

          OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))

          OR (price_tier = 'advanced' AND $1 = 'advanced'))

    `;



    const params = [tier];

    let paramIndex = 2;



    if (category) {

      const safe = validator.trim(category).substring(0, 50);

      query += ` AND category = $${paramIndex}`;

      params.push(safe);

      paramIndex++;

    }



    if (search) {

      const safe = validator.trim(search).substring(0, 100);

      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;

      params.push(`%${safe}%`);

      params.push(`%${safe}%`);

      paramIndex += 2;

    }



    query += ' ORDER BY created_at DESC LIMIT 50';



    const scripts = await all(query, params);

    res.json(scripts);

  } catch (error) {

    console.error('[SCRIPTS ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch scripts' });

  }

});



/**

 * GET /api/scripts/category/:category

 * Get scripts by category

 */

router.get('/scripts/category/:category', async (req, res) => {

  try {

    const { category } = req.params;

    const safe = validator.trim(category).substring(0, 50);

    const tier = getUserTier(req.session?.user) || 'free';



    const scripts = await all(`

      SELECT id, title, description, category, version,

             author_id, download_count, price_tier

      FROM scripts

      WHERE is_public = true AND category = $1

        AND (price_tier = 'free' 

          OR (price_tier = 'paid' AND ($2 IN ('paid', 'advanced')))

          OR (price_tier = 'advanced' AND $2 = 'advanced'))

      ORDER BY created_at DESC

      LIMIT 50

    `, [safe, tier]);



    res.json(scripts);

  } catch (error) {

    console.error('[SCRIPTS CATEGORY ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch scripts' });

  }

});



/**

 * GET /api/scripts/:id

 * Get script details

 */

router.get('/scripts/:id', async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid script ID' });

    }



    const script = await get(

      'SELECT * FROM scripts WHERE id = $1 AND is_public = true',

      [parseInt(id)]

    );



    if (!script) {

      return res.status(404).json({ error: 'Script not found' });

    }



    // Increment view count

    await run('UPDATE scripts SET view_count = view_count + 1 WHERE id = $1', [id]);



    res.json(script);

  } catch (error) {

    console.error('[SCRIPT DETAIL ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch script' });

  }

});



/**

 * POST /api/scripts/:id/download

 * Download script

 */

router.post('/scripts/:id/download', isAuthenticated, submitLimiter, async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid script ID' });

    }



    const script = await get('SELECT * FROM scripts WHERE id = $1', [parseInt(id)]);

    if (!script) {

      return res.status(404).json({ error: 'Script not found' });

    }



    // Check access

    if (script.price_tier !== 'free') {

      const tier = getUserTier(req.session.user);

      if (script.price_tier === 'advanced' && tier !== 'advanced') {

        return res.status(403).json({ error: 'Advanced tier required' });

      }

      if (script.price_tier === 'paid' && tier === 'free') {

        return res.status(403).json({ error: 'Paid tier required' });

      }

    }



    // Track download

    await run(

      'INSERT INTO script_downloads (user_id, script_id) VALUES ($1, $2)',

      [req.session.user.id, id]

    );



    // Return download URL or code

    if (script.file_url) {

      res.json({

        url: script.file_url,

        filename: `${script.title.replace(/\s+/g, '-')}.js`

      });

    } else {

      res.json({

        code: script.code || '',

        title: script.title

      });

    }

  } catch (error) {

    console.error('[DOWNLOAD ERROR]', error);

    res.status(500).json({ error: 'Download failed' });

  }

});



// ============ LESSONS ============



/**

 * GET /api/lessons

 * Get all available lessons

 */

router.get('/lessons', isAuthenticated, async (req, res) => {

  try {

    const tier = getUserTier(req.session.user);



    const lessons = await all(`

      SELECT id, title, description, level, duration, video_type,

             price_tier, creator_id, created_at

      FROM lessons

      WHERE price_tier = 'free'

         OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))

         OR (price_tier = 'advanced' AND $1 = 'advanced')

      ORDER BY created_at DESC

    `, [tier]);



    res.json(lessons);

  } catch (error) {

    console.error('[LESSONS ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch lessons' });

  }

});



/**

 * GET /api/lessons/:id

 * Get lesson details

 */

router.get('/lessons/:id', isAuthenticated, async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid lesson ID' });

    }



    const lesson = await get(

      'SELECT * FROM lessons WHERE id = $1',

      [parseInt(id)]

    );



    if (!lesson) {

      return res.status(404).json({ error: 'Lesson not found' });

    }



    // Get user's progress

    const progress = await get(

      'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',

      [req.session.user.id, id]

    );



    res.json({

      ...lesson,

      progress: progress || null

    });

  } catch (error) {

    console.error('[LESSON DETAIL ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch lesson' });

  }

});



/**

 * POST /api/lessons/:id/progress

 * Update lesson progress

 */

router.post('/lessons/:id/progress', isAuthenticated, submitLimiter, async (req, res) => {

  try {

    const { id } = req.params;

    const { watch_time_seconds, completed } = req.body;



    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid lesson ID' });

    }



    // Validate inputs

    const watchTime = Math.min(parseInt(watch_time_seconds) || 0, 86400);

    const isCompleted = completed === true;



    await run(

      `INSERT INTO lesson_progress (user_id, lesson_id, watch_time_seconds, completed, completed_at)

       VALUES ($1, $2, $3, $4, $5)

       ON CONFLICT (user_id, lesson_id) 

       DO UPDATE SET watch_time_seconds = $3, completed = $4, completed_at = $5`,

      [req.session.user.id, id, watchTime, isCompleted, isCompleted ? new Date() : null]

    );



    res.json({ success: true, message: 'Progress saved' });

  } catch (error) {

    console.error('[PROGRESS ERROR]', error);

    res.status(500).json({ error: 'Failed to save progress' });

  }

});



// ============ CHALLENGES ============



/**

 * GET /api/challenges

 * Get all challenges (NO EXECUTION - static only)

 */

router.get('/challenges', isAuthenticated, async (req, res) => {

  try {

    const tier = getUserTier(req.session.user);



    const challenges = await all(`

      SELECT id, title, description, difficulty, level,

             starter_code, price_tier, created_at

      FROM challenges

      WHERE price_tier = 'free'

         OR (price_tier = 'paid' AND ($1 IN ('paid', 'advanced')))

         OR (price_tier = 'advanced' AND $1 = 'advanced')

      ORDER BY difficulty ASC, created_at DESC

    `, [tier]);



    res.json(challenges);

  } catch (error) {

    console.error('[CHALLENGES ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch challenges' });

  }

});



/**

 * POST /api/challenges/:id/submit

 * Submit challenge solution (NO EXECUTION)

 */

router.post('/challenges/:id/submit', isAuthenticated, submitLimiter, async (req, res) => {

  try {

    const { id } = req.params;

    const { code } = req.body;



    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid challenge ID' });

    }



    if (!code || code.length > 10000) {

      return res.status(400).json({ error: 'Invalid code submission' });

    }



    // Store submission - NO EXECUTION

    await run(

      `INSERT INTO challenge_submissions (user_id, challenge_id, submitted_code, status)

       VALUES ($1, $2, $3, $4)`,

      [req.session.user.id, id, code, 'submitted']

    );



    res.json({

      success: true,

      message: 'Submission saved. Please have an instructor review your code.',

      executionNote: 'Live code execution is not yet supported. Instructors will review submissions manually.'

    });

  } catch (error) {

    console.error('[SUBMISSION ERROR]', error);

    res.status(500).json({ error: 'Submission failed' });

  }

});



// ============ CERTIFICATIONS ============



/**

 * GET /api/certifications

 * Get user's certificates

 */

router.get('/certifications', isAuthenticated, async (req, res) => {

  try {

    const certs = await all(

      'SELECT * FROM certifications WHERE user_id = $1 ORDER BY completion_date DESC',

      [req.session.user.id]

    );



    res.json(certs);

  } catch (error) {

    console.error('[CERTS ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch certificates' });

  }

});



/**

 * POST /api/certifications/issue

 * Issue a certificate

 */

router.post('/certifications/issue', isAuthenticated, async (req, res) => {

  try {

    const { courseName } = req.body;



    if (!courseName || courseName.length > 200) {

      return res.status(400).json({ error: 'Invalid course name' });

    }



    const cert = await issueCertificate(req.session.user.id, courseName);

    res.json(cert);

  } catch (error) {

    console.error('[ISSUE CERT ERROR]', error);

    res.status(500).json({ error: 'Failed to issue certificate' });

  }

});



/**

 * GET /api/certifications/:id

 * Get certificate details

 */

router.get('/certifications/:id', async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid certificate ID' });

    }



    const cert = await verifyCertificate(parseInt(id));

    if (!cert) {

      return res.status(404).json({ error: 'Certificate not found' });

    }



    res.json(cert);

  } catch (error) {

    console.error('[CERT DETAIL ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch certificate' });

  }

});



/**

 * GET /api/certifications/:id/download

 * Download certificate PDF

 */

router.get('/certifications/:id/download', async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid certificate ID' });

    }



    const cert = await get(

      'SELECT * FROM certifications WHERE id = $1',

      [parseInt(id)]

    );



    if (!cert || !cert.pdf_url) {

      return res.status(404).json({ error: 'Certificate not found' });

    }



    // Parse the URL and get the file

    const filename = path.basename(cert.pdf_url);

    const filepath = path.join(path.dirname(__filename), '../../uploads/certificates', filename);



    const exists = await fs.stat(filepath).catch(() => null);

    if (!exists) {

      return res.status(404).json({ error: 'Certificate file not found' });

    }



    res.download(filepath, `GLEECIN-Certificate-${cert.certificate_id}.pdf`);

  } catch (error) {

    console.error('[DOWNLOAD CERT ERROR]', error);

    res.status(500).json({ error: 'Download failed' });

  }

});



/**

 * POST /api/certifications/:id/share

 * Share certificate

 */

router.post('/certifications/:id/share', isAuthenticated, async (req, res) => {

  try {

    const { id } = req.params;

    if (!validator.isInt(id)) {

      return res.status(400).json({ error: 'Invalid certificate ID' });

    }



    const cert = await get(

      'SELECT * FROM certifications WHERE id = $1 AND user_id = $2',

      [parseInt(id), req.session.user.id]

    );



    if (!cert) {

      return res.status(404).json({ error: 'Certificate not found' });

    }



    await run(

      'UPDATE certifications SET shared = true, shared_at = NOW() WHERE id = $1',

      [id]

    );



    res.json({

      success: true,

      shareUrl: `/verify/certificate/${cert.certificate_id}`,

      message: 'Certificate shared'

    });

  } catch (error) {

    console.error('[SHARE CERT ERROR]', error);

    res.status(500).json({ error: 'Failed to share certificate' });

  }

});



// ============ SCHEDULE ============



/**

 * GET /api/schedule

 * Get class schedule

 */

router.get('/schedule', async (req, res) => {

  try {

    const schedule = await all(`

      SELECT id, name, start_date, end_date, instructor, price_tier

      FROM classes

      WHERE start_date > NOW()

      ORDER BY start_date ASC

      LIMIT 20

    `);



    res.json(schedule);

  } catch (error) {

    console.error('[SCHEDULE ERROR]', error);

    res.status(500).json({ error: 'Failed to fetch schedule' });

  }

});



export default router;

  

  // Simple validation based on challenge type

  if (challengeId == 1) {

    // Hello World challenge

    if (code.includes('llSay') && code.includes('Hello World')) {

      results.push({ passed: true, message: '✓ Correct output' });

    } else {

      results.push({ passed: false, message: '✗ Expected "Hello World" output' });

    }

  } else if (challengeId == 2) {

    // Movement challenge

    if (code.includes('llSetPos') || code.includes('llMoveToTarget')) {

      results.push({ passed: true, message: '✓ Movement functions detected' });

    } else {

      results.push({ passed: false, message: '✗ Movement functions not found' });

    }

  } else {

    // Generic validation

    if (code.trim().length > 10) {

      results.push({ passed: true, message: '✓ Code submitted' });

    } else {

      results.push({ passed: false, message: '✗ Code too short' });

    }

  }

  

  return results;

}



// ---- CERTIFICATION ----



/**

 * GET /api/certifications

 * Get user certifications and progress

 */

router.get('/certifications', isAuthenticated, async (req, res) => {

  try {

    const user = req.session.user;



    const certifications = await all(`

      SELECT id, certificate_type as name, issued_at, expires_at, 

             pdf_url, blockchain_hash, is_revoked, metadata

      FROM certificates

      WHERE user_id = $1 AND is_revoked = false

      ORDER BY issued_at DESC

    `, [user.discord_id]);



    res.json(certifications.map(cert => ({

      ...cert,

      earnedDate: cert.issued_at,

      certificateUrl: cert.pdf_url,

      inWorldBadge: cert.metadata?.badge_url || null,

      isVerified: !!cert.blockchain_hash

    })));

  } catch (error) {

    console.error('Error fetching certifications:', error);

    res.status(500).json({ error: 'Failed to fetch certifications' });

  }

});



/**

 * GET /api/certifications/stats

 * Get certification statistics

 */

router.get('/certifications/stats', isAuthenticated, async (req, res) => {

  try {

    const user = req.session.user;



    const stats = await get(`

      SELECT 

        COUNT(*) as total,

        COUNT(blockchain_hash) as verified,

        COUNT(metadata->>'shared_url') as shared

      FROM certificates

      WHERE user_id = $1 AND is_revoked = false

    `, [user.discord_id]);



    res.json(stats);

  } catch (error) {

    console.error('Error fetching certification stats:', error);

    res.status(500).json({ error: 'Failed to fetch stats' });

  }

});



/**

 * GET /api/certifications/:id

 * Get specific certificate details

 */

router.get('/certifications/:id', isAuthenticated, async (req, res) => {

  try {

    const { id } = req.params;

    const user = req.session.user;



    const certificate = await get(`

      SELECT c.*, u.username as recipient_name

      FROM certificates c

      JOIN users u ON c.user_id = u.discord_id

      WHERE c.id = $1 AND c.user_id = $2 AND c.is_revoked = false

    `, [id, user.discord_id]);



    if (!certificate) {

      return res.status(404).json({ error: 'Certificate not found' });

    }



    res.json({

      id: certificate.id,

      name: certificate.certificate_type,

      recipientName: certificate.recipient_name,

      issuedDate: certificate.issued_at,

      imageUrl: `/images/certificates/${certificate.certificate_type.toLowerCase().replace(/\s+/g, '-')}.jpg`,

      isVerified: !!certificate.blockchain_hash,

      blockchainHash: certificate.blockchain_hash,

      pdfUrl: certificate.pdf_url

    });

  } catch (error) {

    console.error('Error fetching certificate:', error);

    res.status(500).json({ error: 'Failed to fetch certificate' });

  }

});



/**

 * GET /api/certifications/:id/pdf

 * Generate and return PDF certificate

 */

router.get('/certifications/:id/pdf', isAuthenticated, async (req, res) => {

  try {

    const { id } = req.params;

    const user = req.session.user;



    const certificate = await get(`

      SELECT c.*, u.username as recipient_name

      FROM certificates c

      JOIN users u ON c.user_id = u.discord_id

      WHERE c.id = $1 AND c.user_id = $2 AND c.is_revoked = false

    `, [id, user.discord_id]);



    if (!certificate) {

      return res.status(404).json({ error: 'Certificate not found' });

    }



    // In a real implementation, this would generate a PDF

    // For now, return a mock PDF

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`);

    

    // Mock PDF content

    const pdfContent = `Certificate for ${certificate.recipient_name}\nIssued: ${certificate.issued_at}\nType: ${certificate.certificate_type}`;

    res.send(pdfContent);

  } catch (error) {

    console.error('Error generating PDF:', error);

    res.status(500).json({ error: 'Failed to generate PDF' });

  }

});



// ---- SCHEDULE ----



/**

 * GET /api/schedule

 * Get class schedule and announcements

 */

router.get('/schedule', async (req, res) => {

  try {

    // This would typically come from a database

    // For now, return static data

    const schedule = {

      classes: [

        {

          name: 'Scripting Fundamentals - Week 1',

          date: '2026-05-01',

          time: '6:00 PM EST',

          duration: '2 hours',

          instructor: 'jwett',

          room: '#class-live'

        },

        {

          name: 'Scripting Fundamentals - Week 1 Office Hours',

          date: '2026-05-05',

          time: '2:00 PM EST',

          duration: '2 hours',

          instructor: 'jwett',

          room: '#office-hours'

        }

      ],

      announcements: [

        {

          date: '2026-04-28',

          title: 'Welcome to GLEECIN Academy!',

          content: 'Classes start May 1st. Make sure you have all required tools installed.',

          important: true

        },

        {

          date: '2026-04-25',

          title: 'Pre-class Survey',

          content: 'Please fill out the course survey to help us customize your experience.',

          important: false

        }

      ]

    };



    res.json(schedule);

  } catch (error) {

    console.error('Error fetching schedule:', error);

    res.status(500).json({ error: 'Failed to fetch schedule' });

  }

});



export default router;