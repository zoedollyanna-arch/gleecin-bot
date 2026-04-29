// TEMP: Enhanced admin setup script
// Run once: cd website && node src/admin-dashboard.js

import { run } from './db/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function setupAdmin() {
  try {
    // 1. Ensure admin user exists and has is_admin = true
    await run(`
      INSERT INTO users (discord_id, username, is_admin, tier) 
      VALUES ('1197552066269282306', 'zoedollyanna', true, 'advanced')
      ON CONFLICT (discord_id) DO UPDATE SET 
        is_admin = true, 
        tier = 'advanced'
    `);
    console.log('✅ Admin user 1197552066269282306 set as admin');

    // 2. Create sample data structure (empty for production)
    console.log('✅ Admin dashboard ready. Login → /admin');
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupAdmin();

