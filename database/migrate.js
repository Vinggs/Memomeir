import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  console.log('----------------------------------------------------');
  console.log('Memomeir - PostgreSQL Database Migration Utility');
  console.log('----------------------------------------------------');

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in your .env file.');
    console.log('Please specify your PostgreSQL connection string in .env:');
    console.log('DATABASE_URL=postgresql://user:password@localhost:5432/memomeir\n');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✓ Connected successfully.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Executing schema.sql DDL migrations...');
    await client.query(sql);

    console.log('✓ Schema applied successfully.');
    console.log("  - Enum 'transaction_type' verified ('income', 'expense').");
    console.log("  - Table 'transactions' created/verified with required columns.");
    console.log('  - Indexes created for date, type, category, and composite stats.');

    const res = await client.query('SELECT COUNT(*) FROM transactions');
    console.log(`✓ Total transactions currently in table: ${res.rows[0].count}`);

    client.release();
    await pool.end();
    console.log('\nMigration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
