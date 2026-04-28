#!/usr/bin/env node
import 'dotenv/config';
import { initDatabase } from './connection.js';

console.log('🔄 Starting database migration...\n');

try {
  await initDatabase();
  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}