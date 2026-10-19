import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'database');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'local_transactions.json');

// Ensure database folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbMode = 'uninitialized'; // 'postgres' | 'local_fallback'
let pgPool = null;

// Initial sample seed transactions adhering strictly to the schema
const DEFAULT_SEED_DATA = [
  {
    id: 1,
    type: 'income',
    amount: 18500000,
    category: 'Salary',
    payment_method: 'Bank Wire',
    description: 'Engineering Retainer / Client Q4 Consulting',
    date: new Date(Date.now() - 12 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 2,
    type: 'expense',
    amount: 45000,
    category: 'Food & Dining',
    payment_method: 'BCA QRIS',
    description: 'Flat white & artisan sourdough at Monolith',
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 3,
    type: 'expense',
    amount: 185000,
    category: 'Utilities',
    payment_method: 'Auto Debit',
    description: 'Gigabit fiber internet & static IP package',
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 4,
    type: 'income',
    amount: 4200000,
    category: 'Investments',
    payment_method: 'Stock Broker',
    description: 'Index fund Q3 dividend yield distribution',
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 5,
    type: 'expense',
    amount: 320000,
    category: 'Transport',
    payment_method: 'Credit Card',
    description: 'Executive airport express express & parking',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 6,
    type: 'expense',
    amount: 650000,
    category: 'Health & Wellness',
    payment_method: 'Apple Pay',
    description: 'Annual biometric health pass & physical',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 7,
    type: 'expense',
    amount: 85000,
    category: 'Food & Dining',
    payment_method: 'GoPay',
    description: 'Ceremonial matcha latte and organic snack',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 8,
    type: 'expense',
    amount: 1200000,
    category: 'Equipment',
    payment_method: 'Credit Card',
    description: 'Studio noise-canceling reference monitors',
    date: new Date(Date.now() - 6 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 6 * 3600000).toISOString()
  }
];

// Local JSON Storage Helpers
function readLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('[Memomeir DB] Failed reading local store:', err.message);
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
}

function writeLocalDb(data) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Validation logic adhering strictly to the PostgreSQL schema requirements
export function validateTransactionData(data) {
  const errors = [];

  // 1. type (enum: 'income', 'expense')
  const validTypes = ['income', 'expense'];
  const type = String(data.type || '').trim().toLowerCase();
  if (!validTypes.includes(type)) {
    errors.push(`Invalid 'type'. Must be strictly 'income' or 'expense'. Received: "${data.type}"`);
  }

  // 2. amount (integer)
  const amountNum = Number(data.amount);
  if (data.amount === undefined || data.amount === null || isNaN(amountNum) || !Number.isInteger(amountNum) || amountNum < 0) {
    errors.push(`Invalid 'amount'. Must be a non-negative integer. Received: "${data.amount}"`);
  }

  // 3. category (string)
  const category = String(data.category || '').trim();
  if (!category) {
    errors.push(`Missing 'category'. Must be a non-empty string.`);
  }

  // 4. payment_method (string)
  const payment_method = String(data.payment_method || '').trim();
  if (!payment_method) {
    errors.push(`Missing 'payment_method'. Must be a non-empty string.`);
  }

  // 5. description (text)
  const description = data.description !== undefined && data.description !== null ? String(data.description).trim() : '';

  // 6. date (timestamp)
  let dateObj = new Date();
  if (data.date) {
    const parsed = new Date(data.date);
    if (isNaN(parsed.getTime())) {
      errors.push(`Invalid 'date' timestamp format. Received: "${data.date}"`);
    } else {
      dateObj = parsed;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      type,
      amount: amountNum,
      category,
      payment_method,
      description,
      date: dateObj.toISOString()
    }
  };
}

// Database Initialization
export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    try {
      console.log('[Memomeir DB] Attempting connection to PostgreSQL...');
      pgPool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
      });

      // Test connection
      const client = await pgPool.connect();
      console.log('[Memomeir DB] Connected successfully to PostgreSQL.');

      // Run DDL migrations
      await client.query(`
        DO $$ BEGIN
            CREATE TYPE transaction_type AS ENUM ('income', 'expense');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS transactions (
            id BIGSERIAL PRIMARY KEY,
            type transaction_type NOT NULL,
            amount INTEGER NOT NULL CHECK (amount >= 0),
            category VARCHAR(100) NOT NULL,
            payment_method VARCHAR(100) NOT NULL,
            description TEXT DEFAULT '',
            date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      `);

      // Check if table is empty, if so, seed sample data
      const countRes = await client.query('SELECT COUNT(*) as count FROM transactions');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        console.log('[Memomeir DB] PostgreSQL transactions table empty. Seeding demo transactions...');
        for (const item of DEFAULT_SEED_DATA) {
          await client.query(
            `INSERT INTO transactions (type, amount, category, payment_method, description, date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [item.type, item.amount, item.category, item.payment_method, item.description, item.date]
          );
        }
      }

      client.release();
      dbMode = 'postgres';
      return { mode: 'postgres', success: true };
    } catch (err) {
      console.warn('[Memomeir DB] PostgreSQL connection failed:', err.message);
      console.warn('[Memomeir DB] Falling back to high-fidelity local schema engine.');
      pgPool = null;
    }
  } else {
    console.log('[Memomeir DB] No DATABASE_URL specified. Initializing high-fidelity local storage engine.');
  }

  // Fallback mode initialization
  readLocalDb();
  dbMode = 'local_fallback';
  return { mode: 'local_fallback', success: true };
}

// Insert Transaction (Adhering to PostgreSQL types)
export async function insertTransaction(rawTx) {
  const validated = validateTransactionData(rawTx);
  if (!validated.valid) {
    const error = new Error(`Validation failed: ${validated.errors.join('; ')}`);
    error.status = 400;
    error.details = validated.errors;
    throw error;
  }

  const { type, amount, category, payment_method, description, date } = validated.data;

  if (dbMode === 'postgres' && pgPool) {
    const queryText = `
      INSERT INTO transactions (type, amount, category, payment_method, description, date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, type, amount, category, payment_method, description, date, created_at
    `;
    const res = await pgPool.query(queryText, [type, amount, category, payment_method, description, date]);
    return res.rows[0];
  } else {
    // Local fallback
    const list = readLocalDb();
    const nextId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const newRecord = {
      id: nextId,
      type,
      amount,
      category,
      payment_method,
      description,
      date,
      created_at: new Date().toISOString()
    };
    list.unshift(newRecord);
    writeLocalDb(list);
    return newRecord;
  }
}

// Get Transactions (with filtering, search, and pagination)
export async function getTransactions(options = {}) {
  const {
    limit = 50,
    offset = 0,
    type,
    category,
    search,
    sortBy = 'date',
    sortOrder = 'desc'
  } = options;

  if (dbMode === 'postgres' && pgPool) {
    let whereClauses = [];
    let values = [];
    let paramIndex = 1;

    if (type && ['income', 'expense'].includes(type)) {
      whereClauses.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (category) {
      whereClauses.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (search) {
      whereClauses.push(`(description ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR payment_method ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const safeSortBy = ['date', 'amount', 'created_at'].includes(sortBy) ? sortBy : 'date';
    const safeOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count query
    const countRes = await pgPool.query(`SELECT COUNT(*) as total FROM transactions ${whereSql}`, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Records query
    values.push(Number(limit), Number(offset));
    const recordsRes = await pgPool.query(
      `SELECT id, type, amount, category, payment_method, description, date, created_at
       FROM transactions
       ${whereSql}
       ORDER BY ${safeSortBy} ${safeOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      transactions: recordsRes.rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    };
  } else {
    // Local fallback
    let list = readLocalDb();

    if (type && ['income', 'expense'].includes(type)) {
      list = list.filter(item => item.type === type);
    }

    if (category) {
      list = list.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.payment_method && item.payment_method.toLowerCase().includes(q))
      );
    }

    const safeSortBy = ['date', 'amount', 'created_at'].includes(sortBy) ? sortBy : 'date';
    const isAsc = sortOrder.toLowerCase() === 'asc';

    list.sort((a, b) => {
      let valA = a[safeSortBy];
      let valB = b[safeSortBy];
      if (safeSortBy === 'date' || safeSortBy === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const total = list.length;
    const paginated = list.slice(Number(offset), Number(offset) + Number(limit));

    return {
      transactions: paginated,
      total,
      limit: Number(limit),
      offset: Number(offset)
    };
  }
}

// Delete a transaction
export async function deleteTransaction(id) {
  if (dbMode === 'postgres' && pgPool) {
    const res = await pgPool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  } else {
    const list = readLocalDb();
    const initialLen = list.length;
    const filtered = list.filter(item => String(item.id) !== String(id));
    if (filtered.length !== initialLen) {
      writeLocalDb(filtered);
      return true;
    }
    return false;
  }
}

// Clear all transactions for clean real database
export async function clearAllTransactions() {
  if (dbMode === 'postgres' && pgPool) {
    await pgPool.query('TRUNCATE TABLE transactions RESTART IDENTITY');
  } else {
    writeLocalDb([]);
  }
  return true;
}

// Reset / Seed demo transactions (only when user explicitly requests demo data)
export async function resetSeedData() {
  if (dbMode === 'postgres' && pgPool) {
    await pgPool.query('TRUNCATE TABLE transactions RESTART IDENTITY');
    for (const item of DEFAULT_SEED_DATA) {
      await pgPool.query(
        `INSERT INTO transactions (type, amount, category, payment_method, description, date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.type, item.amount, item.category, item.payment_method, item.description, item.date]
      );
    }
    return true;
  } else {
    writeLocalDb([...DEFAULT_SEED_DATA]);
    return true;
  }
}

// Compute Aggregated Financial Statistics
export async function getDashboardStats() {
  const result = await getTransactions({ limit: 1000 });
  const allTxs = result.transactions;

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};
  const categoryIncome = {};
  const monthlyExpenses = {};
  const paymentMethodStats = {};

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let currentMonthExpense = 0;
  let currentMonthIncome = 0;

  for (const tx of allTxs) {
    const amt = Number(tx.amount) || 0;
    const txDate = new Date(tx.date);
    const txMonthKey = !isNaN(txDate.getTime())
      ? `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
      : currentMonthKey;

    if (tx.type === 'income') {
      totalIncome += amt;
      categoryIncome[tx.category] = (categoryIncome[tx.category] || 0) + amt;
      if (txMonthKey === currentMonthKey) {
        currentMonthIncome += amt;
      }
    } else {
      totalExpense += amt;
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
      monthlyExpenses[txMonthKey] = (monthlyExpenses[txMonthKey] || 0) + amt;
      paymentMethodStats[tx.payment_method] = (paymentMethodStats[tx.payment_method] || 0) + amt;
      if (txMonthKey === currentMonthKey) {
        currentMonthExpense += amt;
      }
    }
  }

  const totalBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Format category expenses for minimalist chart visualization
  const categoryBreakdown = Object.entries(categoryExpenses)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    summary: {
      totalBalance,
      monthlyExpense: currentMonthExpense,
      monthlyIncome: currentMonthIncome,
      totalIncome,
      totalExpense,
      savingsRate,
      transactionCount: allTxs.length,
      currentMonthKey
    },
    categoryBreakdown,
    paymentMethodStats,
    dbStatus: getDbStatus()
  };
}

// Engine status diagnostic
export function getDbStatus() {
  return {
    engine: dbMode,
    isPostgres: dbMode === 'postgres',
    configuredUrl: Boolean(process.env.DATABASE_URL),
    tableName: 'transactions',
    schemaTypes: {
      type: ['income', 'expense'],
      amount: 'integer',
      category: 'string',
      payment_method: 'string',
      description: 'text',
      date: 'timestamp'
    }
  };
}
