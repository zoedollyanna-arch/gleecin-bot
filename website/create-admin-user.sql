-- GLEECIN Bot Admin User Setup
-- Run this SQL to create admin users in your PostgreSQL database

-- Create Primary Admin (zoedollyanna)
INSERT INTO users (discord_id, username, is_admin, tier, email, joined_at)
VALUES (
  '1197552066269282306',
  'zoedollyanna',
  true,
  'advanced',
  'admin@gleecin.com',
  NOW()
)
ON CONFLICT (discord_id) DO UPDATE SET
  is_admin = true,
  tier = 'advanced';

-- Create a test user (optional)
INSERT INTO users (discord_id, username, is_admin, tier, joined_at)
VALUES (
  '999999999999999999',
  'test_user',
  false,
  'free',
  NOW()
)
ON CONFLICT (discord_id) DO NOTHING;

-- Verify admin user was created
SELECT id, discord_id, username, is_admin, tier, joined_at FROM users WHERE discord_id = '1197552066269282306';
