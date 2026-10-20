import { getPool, initDb } from '../server/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('[Migration] Upgrading database to Gmail + Password Auth...');
  await initDb();
  const pool = getPool();

  if (pool) {
    // 1. Wipe old transactions and users as requested
    await pool.query('DELETE FROM transactions;');
    console.log('[Migration] Cleared all old transactions.');

    await pool.query('DELETE FROM users;');
    console.log('[Migration] Cleared all old preset users (Farrel, Amel, etc.).');

    // 2. Add email column to users table if not exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);
    console.log('[Migration] Added column "email" to users table.');

    // 3. Ensure email has a unique constraint
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
        END IF;
      END $$;
    `);
    console.log('[Migration] Added UNIQUE constraint on email.');

    // 4. Ensure password_hash and name exist
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS color VARCHAR(30);
    `);

    // 5. Check transactions user_id foreign key
    await pool.query(`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);
    `);

    console.log('[Migration] PostgreSQL database migration completed successfully!');
  } else {
    console.log('[Migration] Running in local JSON fallback mode.');
  }

  // Also clean local JSON fallback files if any
  const localUsersPath = path.join(__dirname, '..', 'server', 'data', 'users.json');
  const localTxPath = path.join(__dirname, '..', 'server', 'data', 'transactions.json');
  if (fs.existsSync(localUsersPath)) {
    fs.writeFileSync(localUsersPath, '[]', 'utf-8');
  }
  if (fs.existsSync(localTxPath)) {
    fs.writeFileSync(localTxPath, '[]', 'utf-8');
  }
  console.log('[Migration] Cleared local JSON fallback data.');

  process.exit(0);
}

migrate().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
