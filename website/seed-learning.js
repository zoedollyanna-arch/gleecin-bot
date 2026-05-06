import { get, run } from './src/db/database.js';

const lessons = [
  {
    title: 'Scripting Fundamentals: Variables & Types',
    level: 'beginner',
    duration: '15 minutes',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_type: 'youtube',
    price_tier: 'free',
    description: 'Learn how to declare variables, understand data types, and avoid common type coercion mistakes in LSL.',
    transcript: null,
    tags: ['beginner', 'variables', 'types']
  },
  {
    title: 'Scripting Fundamentals: States & Events',
    level: 'beginner',
    duration: '20 minutes',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_type: 'youtube',
    price_tier: 'free',
    description: 'Understand how LSL states work and how events drive your script logic.',
    transcript: null,
    tags: ['beginner', 'states', 'events']
  },
  {
    title: 'Interactive Learning: Touch, Sensors, and Input',
    level: 'intermediate',
    duration: '18 minutes',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_type: 'youtube',
    price_tier: 'free',
    description: 'Handle user input using touch events and sensors, then route outcomes into clean, testable logic.',
    transcript: null,
    tags: ['intermediate', 'input', 'touch', 'sensors']
  },
  {
    title: 'Production Patterns: Debugging & Safe Error Handling',
    level: 'intermediate',
    duration: '16 minutes',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_type: 'youtube',
    price_tier: 'free',
    description: 'Debugging techniques that keep your scripts stable in production and prevent silent failures.',
    transcript: null,
    tags: ['intermediate', 'debugging', 'production']
  }
];

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [];
}

async function seedLessons() {
  const admin = await get('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');

  if (!admin?.id) {
    throw new Error('No admin user found; cannot seed lessons.');
  }

  for (const lesson of lessons) {
    const safeTitle = String(lesson.title).trim();
    if (!safeTitle) continue;

    const existing = await get('SELECT id FROM lessons WHERE LOWER(title) = LOWER($1)', [safeTitle]);

    const tags = normalizeTags(lesson.tags);

    if (existing?.id) {
      await run(
        `UPDATE lessons
         SET title = $1,
             description = $2,
             level = $3,
             duration = $4,
             video_url = $5,
             video_type = $6,
             video_path = $7,
             video_mime_type = $8,
             video_size_bytes = $9,
             transcript = $10,
             tags = $11,
             price_tier = $12,
             creator_id = $13,
             updated_at = NOW()
         WHERE id = $14`,
        [
          safeTitle,
          lesson.description || null,
          lesson.level || 'beginner',
          lesson.duration || null,
          lesson.video_url,
          lesson.video_type || 'youtube',
          null,
          null,
          null,
          lesson.transcript || null,
          tags,
          lesson.price_tier || 'free',
          admin.id,
          existing.id
        ]
      );
      continue;
    }

    await run(
      `INSERT INTO lessons
        (title, description, level, duration, video_url, video_type, video_path, video_mime_type, video_size_bytes, transcript, tags, price_tier, creator_id, created_at, updated_at)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
      [
        safeTitle,
        lesson.description || null,
        lesson.level || 'beginner',
        lesson.duration || null,
        lesson.video_url,
        lesson.video_type || 'youtube',
        null,
        null,
        null,
        lesson.transcript || null,
        tags,
        lesson.price_tier || 'free',
        admin.id
      ]
    );
  }

  console.log(`[SEED] Seeded/updated ${lessons.length} lessons.`);
}

seedLessons().catch((error) => {
  console.error('[SEED LESSONS ERROR]', error);
  process.exitCode = 1;
});
