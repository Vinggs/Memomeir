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
const LOCAL_USERS_PATH = path.join(DATA_DIR, 'local_users.json');

// Ensure database folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbMode = 'uninitialized'; // 'postgres' | 'local_fallback'
let pgPool = null;

const DEFAULT_USERS = [
  { id: 'farrel', name: 'Farrel', phone: '6281389352752', color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 'amel', name: 'Amel', phone: '', color: '#ec4899', created_at: new Date().toISOString() }
];

export function getPool() {
  return pgPool;
}

export function getDbMode() {
  return dbMode;
}

export function readLocalUsers() {
  if (!fs.existsSync(LOCAL_USERS_PATH)) {
    fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return DEFAULT_USERS;
  }
  try {
    const raw = fs.readFileSync(LOCAL_USERS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch (err) {
    console.error('[Memomeir DB] Failed reading local users:', err.message);
    return DEFAULT_USERS;
  }
}

export function writeLocalUsers(data) {
  fs.writeFileSync(LOCAL_USERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Low-level helper: Read local transactions
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

  // 6. user_id & user_name
  const user_id = data.user_id || data.userId || null;
  const user_name = data.user_name ? String(data.user_name).trim() : (data.user ? String(data.user).trim() : (user_id ? undefined : 'Farrel'));

  // 7. date (timestamp)
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

  const defaultId = user_name?.toLowerCase() === 'amel' ? 'amel' : 'farrel';

  return {
    valid: true,
    data: {
      type,
      amount: amountNum,
      category,
      payment_method,
      description,
      user_id: user_id || defaultId,
      user_name: user_name || 'Farrel',
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

      const client = await pgPool.connect();
      console.log('[Memomeir DB] Connected successfully to PostgreSQL.');

      // Run DDL migrations
      await client.query(`
        DO $$ BEGIN
            CREATE TYPE transaction_type AS ENUM ('income', 'expense');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

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

        CREATE TABLE IF NOT EXISTS transactions (
            id BIGSERIAL PRIMARY KEY,
            type transaction_type NOT NULL,
            amount INTEGER NOT NULL CHECK (amount >= 0),
            category VARCHAR(100) NOT NULL,
            payment_method VARCHAR(100) NOT NULL,
            description TEXT DEFAULT '',
            user_name VARCHAR(100) NOT NULL DEFAULT 'Farrel',
            date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(100) NOT NULL DEFAULT 'Farrel';

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
        CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_name ON transactions(user_name);
        CREATE INDEX IF NOT EXISTS idx_transactions_composite_stats ON transactions(user_name, date, type, amount);
      `);

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
  readLocalUsers();
  dbMode = 'local_fallback';
  return { mode: 'local_fallback', success: true };
}

// User Management Methods
export async function getUsers() {
  if (dbMode === 'postgres' && pgPool) {
    const res = await pgPool.query('SELECT id, name, phone, color, created_at FROM users ORDER BY created_at ASC');
    return res.rows;
  }
  return readLocalUsers();
}

export async function createUser({ name, phone = '', color = '#3b82f6' }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('User name is required');
  const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (dbMode === 'postgres' && pgPool) {
    const res = await pgPool.query(
      `INSERT INTO users (id, name, phone, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, color = EXCLUDED.color
       RETURNING id, name, phone, color, created_at`,
      [id, cleanName, phone, color]
    );
    return res.rows[0];
  }
  const users = readLocalUsers();
  const existing = users.find(u => u.id === id);
  if (existing) {
    existing.name = cleanName;
    existing.phone = phone;
    existing.color = color;
    writeLocalUsers(users);
    return existing;
  }
  const newUser = { id, name: cleanName, phone, color, created_at: new Date().toISOString() };
  users.push(newUser);
  writeLocalUsers(users);
  return newUser;
}

export async function deleteUser(id) {
  if (id === 'farrel') {
    throw new Error('Default owner Farrel cannot be deleted');
  }
  if (dbMode === 'postgres' && pgPool) {
    await pgPool.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }
  let users = readLocalUsers();
  users = users.filter(u => u.id !== id);
  writeLocalUsers(users);
  return true;
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

  const { type, amount, category, payment_method, description, user_id, user_name, date } = validated.data;

  if (dbMode === 'postgres' && pgPool) {
    const queryText = `
      INSERT INTO transactions (type, amount, category, payment_method, description, user_id, user_name, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, type, amount, category, payment_method, description, user_id, user_name, date, created_at
    `;
    const res = await pgPool.query(queryText, [type, amount, category, payment_method, description, user_id, user_name, date]);
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
      user_id,
      user_name,
      date,
      created_at: new Date().toISOString()
    };
    list.unshift(newRecord);
    writeLocalDb(list);
    return newRecord;
  }
}

// Get Transactions (with filtering, search, pagination, and multi-user filter)
export async function getTransactions(options = {}) {
  const {
    limit = 50,
    offset = 0,
    type,
    category,
    search,
    user_id,
    user_name,
    sortBy = 'date',
    sortOrder = 'desc'
  } = options;

  if (dbMode === 'postgres' && pgPool) {
    let whereClauses = [];
    let values = [];
    let paramIndex = 1;

    if (user_id && user_id !== 'all') {
      whereClauses.push(`user_id = $${paramIndex++}`);
      values.push(user_id);
    } else if (user_name && user_name !== 'all') {
      whereClauses.push(`user_name ILIKE $${paramIndex++}`);
      values.push(user_name);
    }

    if (type && ['income', 'expense'].includes(type)) {
      whereClauses.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (category) {
      whereClauses.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (search) {
      whereClauses.push(`(description ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR payment_method ILIKE $${paramIndex} OR user_name ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const safeSortBy = ['date', 'amount', 'created_at', 'user_name'].includes(sortBy) ? sortBy : 'date';
    const safeOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count query
    const countRes = await pgPool.query(`SELECT COUNT(*) as total FROM transactions ${whereSql}`, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Records query
    values.push(Number(limit), Number(offset));
    const recordsRes = await pgPool.query(
      `SELECT id, type, amount, category, payment_method, description, user_name, date, created_at
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

    if (user_id && user_id !== 'all') {
      list = list.filter(item => String(item.user_id || 'farrel') === String(user_id));
    } else if (user_name && user_name !== 'all') {
      list = list.filter(item => String(item.user_name || 'Farrel').toLowerCase() === user_name.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.payment_method && item.payment_method.toLowerCase().includes(q)) ||
        (item.user_name && item.user_name.toLowerCase().includes(q))
      );
    }

    const safeSortBy = ['date', 'amount', 'created_at'].includes(sortBy) ? sortBy : 'date';
    const safeOrder = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let valA = a[safeSortBy];
      let valB = b[safeSortBy];
      if (safeSortBy === 'date' || safeSortBy === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      return valA > valB ? safeOrder : valA < valB ? -safeOrder : 0;
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

// Get Single Transaction by ID
export async function getTransactionById(id) {
  if (dbMode === 'postgres' && pgPool) {
    const res = await pgPool.query(
      'SELECT id, type, amount, category, payment_method, description, user_name, date, created_at FROM transactions WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  } else {
    const list = readLocalDb();
    return list.find(item => String(item.id) === String(id)) || null;
  }
}

// Delete Transaction
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

// Clear transactions from database (optionally scoped to user)
export async function clearAllTransactions(userId) {
  if (dbMode === 'postgres' && pgPool) {
    if (userId) {
      await pgPool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    } else {
      await pgPool.query('TRUNCATE TABLE transactions RESTART IDENTITY');
    }
  } else {
    if (userId) {
      let list = readLocalDb();
      list = list.filter(t => t.user_id !== userId);
      writeLocalDb(list);
    } else {
      writeLocalDb([]);
    }
  }
  return true;
}

// Reset data (clears transactions to start fresh)
export async function resetSeedData(userId) {
  return await clearAllTransactions(userId);
}

// Compute Aggregated Financial Statistics (With Multi-User Filtering & Breakdown)
export async function getDashboardStats(options = {}) {
  const { user_id, user_name } = options;
  const result = await getTransactions({ limit: 5000, user_id, user_name });
  const allTxs = result.transactions;

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};
  const categoryIncome = {};
  const monthlyExpenses = {};
  const paymentMethodStats = {};
  const userBreakdown = {};

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
    const uName = tx.user_name || 'Farrel';

    if (!userBreakdown[uName]) {
      userBreakdown[uName] = { income: 0, expense: 0, count: 0 };
    }
    userBreakdown[uName].count += 1;

    if (tx.type === 'income') {
      totalIncome += amt;
      userBreakdown[uName].income += amt;
      categoryIncome[tx.category] = (categoryIncome[tx.category] || 0) + amt;
      if (txMonthKey === currentMonthKey) {
        currentMonthIncome += amt;
      }
    } else {
      totalExpense += amt;
      userBreakdown[uName].expense += amt;
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

  // Format category expenses for chart visualization
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
      currentMonthKey,
      activeUser: user_name || 'all'
    },
    categoryBreakdown,
    paymentMethodStats,
    userBreakdown,
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
      user_name: 'string',
      date: 'timestamp'
    }
  };
}

export async function logWebhook({ rawBody, headers, result, error }) {
  if (dbMode === 'postgres' && pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id BIGSERIAL PRIMARY KEY,
          raw_body TEXT,
          headers TEXT,
          result TEXT,
          error TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pgPool.query(
        `INSERT INTO webhook_logs (raw_body, headers, result, error) VALUES ($1, $2, $3, $4)`,
        [
          typeof rawBody === 'object' ? JSON.stringify(rawBody) : String(rawBody || ''),
          typeof headers === 'object' ? JSON.stringify(headers) : String(headers || ''),
          typeof result === 'object' ? JSON.stringify(result) : String(result || ''),
          error ? String(error) : null
        ]
      );
    } catch (err) {
      console.error('[Memomeir DB] Failed logging webhook:', err.message);
    }
  }
}

export async function getWebhookLogs(limit = 10) {
  if (dbMode === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query(`SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT $1`, [limit]);
      return res.rows;
    } catch {
      return [];
    }
  }
  return [];
}

