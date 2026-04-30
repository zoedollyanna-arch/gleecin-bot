/**
 * Seed script for schedules and announcements.
 * Run with: node seed-schedules.js
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getAdminId(client) {
  const result = await client.query('SELECT id FROM users WHERE is_admin = true ORDER BY id ASC LIMIT 1');
  return result.rows[0]?.id || null;
}

async function getClassId(client) {
  const result = await client.query('SELECT id FROM classes ORDER BY id ASC LIMIT 1');
  return result.rows[0]?.id || null;
}

async function seedSchedules() {
  const client = await pool.connect();

  try {
    console.log('🔄 Seeding schedules...');

    const adminId = await getAdminId(client);
    const classId = await getClassId(client);

    const schedules = [
      {
        title: 'Scripting Fundamentals - Week 1',
        instructor: 'jwett',
        scheduled_date: '2026-05-01',
        scheduled_time: '18:00',
        capacity: 20,
        description: 'Introduction to LSL syntax, states, and basic events.'
      },
      {
        title: 'Office Hours',
        instructor: 'jwett',
        scheduled_date: '2026-05-05',
        scheduled_time: '14:00',
        capacity: 10,
        description: 'Open Q&A and debugging help for enrolled students.'
      },
      {
        title: 'Scripting Fundamentals - Week 2',
        instructor: 'jwett',
        scheduled_date: '2026-05-08',
        scheduled_time: '18:00',
        capacity: 20,
        description: 'Variables, conditions, and object interaction patterns.'
      }
    ];

    for (const schedule of schedules) {
      await client.query(
        `
          INSERT INTO schedules (
            title, instructor, scheduled_date, scheduled_time, capacity, description,
            class_id, published, published_at, created_by, updated_by, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), $8, $8, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `,
        [
          schedule.title,
          schedule.instructor,
          schedule.scheduled_date,
          schedule.scheduled_time,
          schedule.capacity,
          schedule.description,
          classId,
          adminId
        ]
      );
      console.log(`✅ Seeded schedule: ${schedule.title}`);
    }

    const announcements = [
      {
        title: 'Welcome to GLEECIN Academy!',
        content: 'Classes start May 1st. Make sure you have all required tools installed.',
        important: true
      },
      {
        title: 'Pre-class Survey',
        content: 'Please fill out the course survey to help us customize your experience.',
        important: false
      }
    ];

    for (const announcement of announcements) {
      await client.query(
        `
          INSERT INTO announcements (title, content, important, created_by, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
        `,
        [announcement.title, announcement.content, announcement.important, adminId]
      );
      console.log(`✅ Seeded announcement: ${announcement.title}`);
    }

    console.log('✨ Schedule seeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedSchedules().catch((error) => {
  console.error('❌ Failed to seed schedules:', error);
  process.exit(1);
});
