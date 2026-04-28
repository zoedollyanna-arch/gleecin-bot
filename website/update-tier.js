import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('🔄 Updating admin user tier to advanced...');
  const result = await pool.query(
    "UPDATE users SET tier = 'advanced' WHERE discord_id = '1197552066269282306'"
  );
  console.log(`✅ Updated ${result.rowCount} row(s)\n`);
  
  const verify = await pool.query(
    "SELECT id, username, is_admin, tier FROM users WHERE discord_id = '1197552066269282306'"
  );
  console.log('✅ Admin User Profile:');
  console.table(verify.rows);
  
  process.exit(0);
} catch(e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
} finally {
  pool.end();
}
