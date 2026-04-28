import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminUser() {
  const client = await pool.connect();
  try {
    const discordId = '1197552066269282306';
    const username = 'zoedollyanna';

    const result = await client.query(
      `INSERT INTO users (discord_id, username, is_admin) 
       VALUES ($1, $2, true) 
       ON CONFLICT (discord_id) 
       DO UPDATE SET is_admin = true, username = $2 
       RETURNING *`,
      [discordId, username]
    );

    console.log('✅ Admin user created/updated successfully:');
    console.log('   Discord ID:', result.rows[0].discord_id);
    console.log('   Username:', result.rows[0].username);
    console.log('   Is Admin:', result.rows[0].is_admin);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdminUser();
