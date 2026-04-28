/**
 * Neon SQL Migration Runner
 * Executes create-admin-user.sql against Neon database
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🔄 Connecting to Neon database...');
    const client = await pool.connect();
    console.log('✅ Connected to Neon');

    // Read SQL file
    const sqlPath = path.join(process.cwd(), 'website', 'create-admin-user.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('📄 SQL file loaded');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`\n📋 Running ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing SQL...`);
      
      try {
        const result = await client.query(statement);
        console.log(`    ✅ Success (${result.rows.length} rows affected)`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('CONFLICT')) {
          console.log(`    ℹ️  Already exists (skipped)`);
        } else {
          throw error;
        }
      }
    }

    // Verify admin user
    console.log('\n🔍 Verifying admin user...\n');
    const result = await client.query(
      "SELECT id, discord_id, username, is_admin, tier, joined_at FROM users WHERE discord_id = '1197552066269282306'"
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin user found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Discord ID: ${user.discord_id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Is Admin: ${user.is_admin}`);
      console.log(`   Tier: ${user.tier}`);
      console.log(`   Joined: ${user.joined_at}`);
    } else {
      console.log('❌ Admin user not found');
    }

    // Show all users
    console.log('\n📊 All users in database:\n');
    const allUsers = await client.query(
      "SELECT id, discord_id, username, is_admin, tier FROM users LIMIT 10"
    );
    
    if (allUsers.rows.length > 0) {
      console.table(allUsers.rows);
    } else {
      console.log('   (No users yet)');
    }

    client.release();
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
