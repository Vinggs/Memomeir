import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, 'local_transactions.json');

async function syncLocalToNeon() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is missing.');
    return;
  }

  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.log('No local transactions file found.');
    return;
  }

  const localData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  if (!Array.isArray(localData) || localData.length === 0) {
    console.log('No local transactions to sync.');
    return;
  }

  console.log(`Found ${localData.length} local transactions. Syncing to Neon PostgreSQL...`);

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    for (const tx of localData) {
      const check = await client.query(
        'SELECT id FROM transactions WHERE description = $1 AND amount = $2',
        [tx.description, tx.amount]
      );

      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO transactions (type, amount, category, payment_method, description, date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tx.type, tx.amount, tx.category, tx.payment_method, tx.description, tx.date]
        );
        console.log(`✓ Synced: ${tx.description} (Rp ${tx.amount})`);
      } else {
        console.log(`- Already in Neon: ${tx.description}`);
      }
    }

    const total = await client.query('SELECT COUNT(*) FROM transactions');
    console.log(`Total rows in Neon transactions table: ${total.rows[0].count}`);
  } catch (err) {
    console.error('Error syncing:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

syncLocalToNeon();
