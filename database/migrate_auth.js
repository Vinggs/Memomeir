import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrateAuth() {
  const client = await pool.connect();
  try {
    console.log('[Auth Migration] Starting authentication & multi-user schema update...');

    // 1. Recreate or alter 'users' table with password_hash & username
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        phone VARCHAR(30) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        color VARCHAR(20) DEFAULT '#3b82f6',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure columns exist if table already had different structure
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        END IF;
      END $$;
    `);

    // 2. Check / Seed initial account 'farrel' (password: farrel123)
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('farrel123', salt);

    const userCheck = await client.query('SELECT id FROM users WHERE username = $1 OR phone = $2', ['farrel', '6281389352752']);
    let farrelId;

    if (userCheck.rows.length === 0) {
      const inserted = await client.query(`
        INSERT INTO users (name, username, phone, password_hash, color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['Farrel', 'farrel', '6281389352752', defaultPassword, '#3b82f6']);
      farrelId = inserted.rows[0].id;
      console.log(`[Auth Migration] Created default user 'farrel' (id: ${farrelId})`);
    } else {
      farrelId = userCheck.rows[0].id;
      // Ensure password_hash and username are set
      await client.query(`
        UPDATE users
        SET username = COALESCE(username, 'farrel'),
            password_hash = COALESCE(password_hash, $1)
        WHERE id = $2
      `, [defaultPassword, farrelId]);
      console.log(`[Auth Migration] Updated default user 'farrel' (id: ${farrelId})`);
    }

    // 3. Update 'transactions' table to include 'user_id'
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
          ALTER TABLE transactions ADD COLUMN user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Assign any existing transactions to farrelId
    await client.query(`
      UPDATE transactions
      SET user_id = $1
      WHERE user_id IS NULL
    `, [farrelId]);

    // Make user_id NOT NULL
    await client.query(`
      ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
    `);

    // Create performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    `);

    console.log('[Auth Migration] Successfully upgraded schema for full login / auth isolation!');
  } catch (err) {
    console.error('[Auth Migration] Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAuth();
