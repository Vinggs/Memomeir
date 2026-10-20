import express from 'express';
import {
  insertTransaction,
  getTransactions,
  getDashboardStats,
  deleteTransaction,
  resetSeedData,
  clearAllTransactions,
  getDbStatus
} from './db.js';

const router = express.Router();

/**
 * Normalizes incoming WhatsApp AI Bot payload.
 * Supports direct JSON as well as common bot envelope wrappers:
 * { "type": "expense", "amount": 50000, ... }
 * OR { "transaction": { ... } }
 * OR { "data": { ... } }
 * OR { "parsed": { ... } }
 */
function extractTransactionPayload(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  // If wrapped in transaction, data, or parsed object
  const target = body.transaction || body.data || body.parsed || body;

  let type = target.type || target.transaction_type || target.kind;
  let amount = target.amount || target.nominal || target.value || target.price;
  let category = target.category || target.kategori || target.tag || 'Uncategorized';
  let payment_method = target.payment_method || target.metode_pembayaran || target.paymentMethod || target.payment || 'WhatsApp';
  let description = target.description || target.deskripsi || target.keterangan || target.notes || target.note || '';
  let date = target.date || target.tanggal || target.timestamp || new Date().toISOString();

  // Normalize amount if passed as string (e.g. "Rp 45.000" or "45000")
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]+/g, '');
    amount = Math.round(parseFloat(cleaned));
  } else if (typeof amount === 'number') {
    amount = Math.round(amount);
  }

  // Normalize type
  if (typeof type === 'string') {
    type = type.trim().toLowerCase();
    if (type === 'pengeluaran' || type === 'keluar' || type === 'debit') type = 'expense';
    if (type === 'pemasukan' || type === 'masuk' || type === 'credit') type = 'income';
  }

  return {
    type,
    amount,
    category: String(category).trim(),
    payment_method: String(payment_method).trim(),
    description: String(description).trim(),
    date
  };
}

// -----------------------------------------------------------------------------
// 1. WhatsApp AI Bot Webhook Endpoints
// -----------------------------------------------------------------------------

/**
 * POST /api/webhook/transaction (and alias POST /api/webhook)
 * Primary webhook route designed to receive JSON POST requests from WhatsApp AI bot
 * Inserts directly into the 'transactions' table
 */
async function handleWebhookPost(req, res) {
  try {
    const rawBody = req.body;

    if (!rawBody || Object.keys(rawBody).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty request body. Expected JSON payload with type, amount, category, payment_method, description, date.',
        schema_documentation: {
          type: "enum: 'income' | 'expense' (required)",
          amount: "integer (required, non-negative)",
          category: "string (required, e.g. 'Food & Dining')",
          payment_method: "string (required, e.g. 'BCA', 'Cash', 'Credit Card')",
          description: "text (optional description/notes)",
          date: "timestamp (optional, defaults to current time)"
        }
      });
    }

    // Optional Secret Token verification if configured
    const configuredSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (configuredSecret) {
      const authHeader = req.headers['authorization'] || req.headers['x-webhook-secret'] || req.query.secret;
      if (authHeader && authHeader !== configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized webhook request: invalid secret token.'
        });
      }
    }

    const payload = extractTransactionPayload(rawBody);

    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract transaction data from request.'
      });
    }

    // Insert into 'transactions' table
    const recordedTransaction = await insertTransaction(payload);

    console.log(`[Memomeir Webhook] Transaction ${recordedTransaction.id} inserted via WhatsApp Bot:`, {
      type: recordedTransaction.type,
      amount: recordedTransaction.amount,
      category: recordedTransaction.category,
      method: recordedTransaction.payment_method
    });

    return res.status(201).json({
      success: true,
      message: "Transaction inserted directly into 'transactions' table successfully.",
      transaction: recordedTransaction,
      db_engine: getDbStatus().engine
    });
  } catch (err) {
    console.error('[Memomeir Webhook] Error processing transaction:', err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error while inserting transaction.',
      details: err.details || null
    });
  }
}

// Support both endpoint paths for convenience
router.post('/webhook/transaction', handleWebhookPost);
router.post('/webhook', handleWebhookPost);

/**
 * GET /api/webhook/transaction
 * Informational endpoint for WhatsApp Bot developers to verify webhook health and specifications
 */
router.get('/webhook/transaction', (req, res) => {
  res.json({
    name: 'Memomeir WhatsApp AI Bot Transaction Webhook',
    status: 'online',
    target_table: 'transactions',
    method: 'POST',
    endpoint: '/api/webhook/transaction',
    sample_payload: {
      type: 'expense',
      amount: 45000,
      category: 'Food & Dining',
      payment_method: 'BCA QRIS',
      description: 'Flat white and artisan toast via WhatsApp Bot',
      date: new Date().toISOString()
    },
    schema: {
      type: "enum: 'income' | 'expense' (required)",
      amount: "integer >= 0 (required)",
      category: "string (required)",
      payment_method: "string (required)",
      description: "text (optional)",
      date: "timestamp / ISO-8601 (optional, default: now)"
    }
  });
});

// -----------------------------------------------------------------------------
// 2. Dashboard API Endpoints
// -----------------------------------------------------------------------------

// GET /api/stats - High-level summary cards & category visualizations
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions - Data table queries with filtering & pagination
router.get('/transactions', async (req, res) => {
  try {
    const { limit, offset, type, category, search, sortBy, sortOrder } = req.query;
    const result = await getTransactions({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      type,
      category,
      search,
      sortBy,
      sortOrder
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions - Manual transaction addition from UI
router.post('/transactions', async (req, res) => {
  try {
    const transaction = await insertTransaction(req.body);
    res.status(201).json({ success: true, transaction });
  } catch (err) {
    res.status(err.status || 400).json({
      success: false,
      error: err.message,
      details: err.details
    });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.json({ success: true, message: `Transaction ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/seed - Reset / populate sample data (optional demo)
router.post('/seed', async (req, res) => {
  try {
    await resetSeedData();
    const stats = await getDashboardStats();
    res.json({ success: true, message: 'Database reset with sample transactions', stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clear - Wipe all transactions for clean real database
router.post('/clear', async (req, res) => {
  try {
    await clearAllTransactions();
    const stats = await getDashboardStats();
    res.json({ success: true, message: 'Database cleared. Siap untuk data real.', stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/whatsapp/status - Real-time status and security config of Baileys WhatsApp bot
router.get('/whatsapp/status', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const statusFile = path.join(process.cwd(), 'server', 'whatsapp', 'status.json');
    const configFile = path.join(process.cwd(), 'server', 'whatsapp', 'config.json');

    let status = {
      state: 'offline',
      message: 'Bot WhatsApp belum dijalankan. Jalankan "npm run bot" untuk menyambungkan.'
    };

    if (fs.existsSync(statusFile)) {
      status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
    }

    if (fs.existsSync(configFile)) {
      status.config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } else {
      status.config = {
        mode: 'self_only',
        ownerName: 'Farrel',
        ownerPhone: '6281389352752'
      };
    }

    return res.json(status);
  } catch (err) {
    res.status(500).json({ state: 'error', error: err.message });
  }
});

// GET /api/whatsapp/config - View WhatsApp security and room lock config
router.get('/whatsapp/config', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configFile = path.join(process.cwd(), 'server', 'whatsapp', 'config.json');
    if (fs.existsSync(configFile)) {
      return res.json(JSON.parse(fs.readFileSync(configFile, 'utf-8')));
    }
    return res.json({
      mode: 'self_only',
      ownerName: 'Farrel',
      ownerPhone: '6281389352752'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/config - Update WhatsApp security and room lock config
router.post('/whatsapp/config', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configFile = path.join(process.cwd(), 'server', 'whatsapp', 'config.json');
    let currentConfig = {};
    if (fs.existsSync(configFile)) {
      currentConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    }
    const newConfig = {
      ...currentConfig,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2));
    res.json({ success: true, config: newConfig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health - Diagnostic check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    db: getDbStatus()
  });
});

export default router;

