import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return result.rowCount > 0;
}

async function main() {
  const client = await pool.connect();
  try {
    const hasCourseName = await columnExists(client, 'certificates', 'course_name');
    if (!hasCourseName) {
      await client.query(`ALTER TABLE certificates ADD COLUMN course_name TEXT`);
      console.log('OK: added certificates.course_name');
    } else {
      console.log('OK: certificates.course_name already exists');
    }

    const hasCertificateUrl = await columnExists(client, 'certificates', 'certificate_url');
    if (!hasCertificateUrl) {
      await client.query(`ALTER TABLE certificates ADD COLUMN certificate_url TEXT`);
      console.log('OK: added certificates.certificate_url');
    }

    const hasIssuedAt = await columnExists(client, 'certificates', 'issued_at');
    if (!hasIssuedAt) {
      await client.query(`ALTER TABLE certificates ADD COLUMN issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('OK: added certificates.issued_at');
    }

    const hasCertificateId = await columnExists(client, 'certificates', 'certificate_id');
    if (!hasCertificateId) {
      await client.query(`ALTER TABLE certificates ADD COLUMN certificate_id TEXT`);
      console.log('OK: added certificates.certificate_id');
    }

    const hasIsCustom = await columnExists(client, 'certificates', 'is_custom');
    if (!hasIsCustom) {
      await client.query(`ALTER TABLE certificates ADD COLUMN is_custom BOOLEAN DEFAULT false`);
      console.log('OK: added certificates.is_custom');
    }

    console.log('Certificate schema repair complete');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Certificate schema repair failed:', error);
  process.exit(1);
});
