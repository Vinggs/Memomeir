import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  console.log('[Migration] Connected to Neon PostgreSQL...');

  try {
    // 1. Wipe all dummy transactions so dashboard starts from fresh Rp 0
    await client.query('TRUNCATE TABLE transactions RESTART IDENTITY;');
    console.log('[Migration] Cleaned all dummy data from transactions table (Reset to Rp 0)');

    // 2. Add user_name column and index to transactions table
    await client.query(`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(100) NOT NULL DEFAULT 'Farrel';
      CREATE INDEX IF NOT EXISTS idx_transactions_user_name ON transactions(user_name);
    `);
    console.log('[Migration] Added user_name column & index to transactions');

    // 3. Create users table and default members
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(50) DEFAULT '',
        color VARCHAR(20) DEFAULT '#3b82f6',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO users (id, name, phone, color)
      VALUES 
        ('farrel', 'Farrel', '6281389352752', '#3b82f6'),
        ('amel', 'Amel', '', '#ec4899')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[Migration] Created users table and initialized Farrel & Amel profiles');

    console.log('[Migration] Complete and successful!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
