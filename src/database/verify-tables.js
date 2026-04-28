#!/usr/bin/env node
import 'dotenv/config';
import { query } from './connection.js';

async function verifyTables() {
  console.log('🔍 Verifying database tables...\n');
  
  const expectedTables = [
    'users',
    'tickets', 
    'welcome_logs',
    'channel_settings',
    'community_logs',
    'coding_challenges',
    'test_cases',
    'challenge_submissions',
    'scripts',
    'lessons',
    'lesson_progress',
    'subscriptions',
    'payments',
    'premium_content_access',
    'certificates',
    'badges'
  ];

  try {
    const result = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      ORDER BY tablename;
    `, [expectedTables]);

    const existingTables = new Set(result.rows.map(row => row.tablename));
    
    console.log('✅ Found tables:');
    expectedTables.forEach(table => {
      if (existingTables.has(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} (MISSING)`);
      }
    });

    console.log(`\n📊 Summary: ${existingTables.size}/${expectedTables.length} tables found`);
    
    if (existingTables.size === expectedTables.length) {
      console.log('\n🎉 All tables created successfully!');
    } else {
      console.log('\n⚠️  Some tables are missing. Check the migration logs.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying tables:', error);
  }
}

verifyTables();