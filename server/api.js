import express from 'express';
import {
  insertTransaction,
  getTransactions,
  getDashboardStats,
  deleteTransaction,
  resetSeedData,
  clearAllTransactions,
  getDbStatus,
  getUsers,
  createUser,
  deleteUser,
  logWebhook,
  getWebhookLogs,
  getPool
} from './db.js';

import {
  registerUser,
  loginUser,
  authenticateGoogleUser,
  getUserById,
  findUserByPhoneOrName,
  requireAuth,
  optionalAuth
} from './auth.js';

import { parsePushNotification } from './notification_parser.js';
import { recognizeReceiptImage, parseReceiptText } from './ocr.js';

const router = express.Router();

/**
 * Normalizes incoming WhatsApp AI Bot / Push Notification payload.
 * Supports direct JSON as well as common bot envelope wrappers:
 * { "type": "expense", "amount": 50000, ... }
 * OR { "transaction": { ... } }
 * OR { "text": "Kamu berhasil bayar Rp15.500 ke QRIS WARTEG BAHARI" }
 */
function extractTransactionPayload(body) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = { text: body };
    }
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  // If raw notification text is supplied without structured amount
  const target = body.transaction || body.data || body.parsed || body;
  
  // Combine all possible text fields sent by MacroDroid / notification forwarders
  const rawTextParts = [
    target.text,
    target.notif_text,
    target.message,
    target.notif_message,
    target.notification,
    target.notification_text,
    target.content,
    target.body,
    target.desc,
    target.description,
    target.subtext,
    target.notif_subtext,
    target.ticker,
    target.notif_ticker
  ].filter(p => typeof p === 'string' && p.trim().length > 0);

  const rawText = rawTextParts.join(' ') || (typeof body === 'string' ? body : '');
  const titleText = target.title || target.notif_title || '';

  let type = target.type || target.transaction_type || target.kind;
  let amount = target.amount || target.nominal || target.value || target.price;
  let category = target.category || target.kategori || target.tag;
  let payment_method = target.payment_method || target.metode_pembayaran || target.paymentMethod || target.payment;
  let description = target.description || target.deskripsi || target.keterangan || target.notes || target.note || '';
  let date = target.date || target.tanggal || target.timestamp || new Date().toISOString();
  let user_id = target.user_id || target.userId;
  let user_name = target.user_name || target.user || target.member || target.sender_name || 'Farrel';

  // If no structured amount but has notification text or title, parse via notification parser
  if ((!amount || isNaN(Number(amount))) && (rawText || titleText)) {
    const parsedNotif = parsePushNotification({
      app: target.app || target.notif_app || target.package || '',
      title: titleText,
      text: rawText,
      package: target.package || target.notif_package || ''
    });

    if (parsedNotif.isValid) {
      return {
        type: parsedNotif.type,
        amount: parsedNotif.amount,
        category: category || parsedNotif.category,
        payment_method: payment_method || parsedNotif.payment_method,
        description: description || parsedNotif.description,
        date: date || parsedNotif.date,
        user_id: user_id || (user_name?.toLowerCase() === 'amel' ? 'amel' : 'farrel'),
        user_name: String(user_name || 'Farrel').trim()
      };
    } else {
      return {
        isValid: false,
        reason: parsedNotif.reason || 'Notification does not contain a financial transaction.'
      };
    }
  }

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
    type: type || 'expense',
    amount: amount || 0,
    category: String(category || 'Miscellaneous').trim(),
    payment_method: String(payment_method || 'WhatsApp').trim(),
    description: String(description || rawText).trim(),
    date,
    user_id: user_id || (user_name?.toLowerCase() === 'amel' ? 'amel' : 'farrel'),
    user_name: String(user_name || 'Farrel').trim()
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
    let rawBody = req.body;

    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        rawBody = { text: rawBody };
      }
    }

    if (!rawBody || (typeof rawBody === 'object' && Object.keys(rawBody).length === 0)) {
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

    if (!payload || payload.isValid === false) {
      await logWebhook({ rawBody, headers: req.headers, result: { ignored: true, reason: payload?.reason || 'Non-financial' } });
      return res.status(200).json({
        success: false,
        ignored: true,
        message: payload?.reason || 'Non-financial notification ignored.'
      });
    }

    if (!payload.amount || payload.amount <= 0) {
      await logWebhook({ rawBody, headers: req.headers, error: 'Amount <= 0' });
      return res.status(400).json({
        success: false,
        error: 'Transaction amount must be greater than 0.'
      });
    }

    // Dynamic user matching (from user_id, phone, sender, or username)
    let matchedUser = null;
    const lookupKey = rawBody.user_id || rawBody.phone || rawBody.sender || payload.user_name;
    if (lookupKey) {
      matchedUser = await findUserByPhoneOrName(lookupKey);
    }

    // If no specific match or matched default seeded 'farrel', prefer primary registered user (e.g. Google user)
    if (!matchedUser || matchedUser.id === 'farrel') {
      const pool = getPool();
      if (pool) {
        try {
          const primaryRes = await pool.query(
            "SELECT id, name, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY created_at DESC LIMIT 1"
          );
          if (primaryRes.rows.length > 0) {
            matchedUser = primaryRes.rows[0];
          }
        } catch (e) {
          console.warn('[Webhook User Match Warning]:', e.message);
        }
      }
    }

    if (matchedUser) {
      payload.user_id = matchedUser.id;
      payload.user_name = matchedUser.name;
    }

    // Insert into 'transactions' table
    const recordedTransaction = await insertTransaction(payload);

    console.log(`[Memomeir Webhook] Transaction ${recordedTransaction.id} inserted via WhatsApp Bot:`, {
      type: recordedTransaction.type,
      amount: recordedTransaction.amount,
      category: recordedTransaction.category,
      method: recordedTransaction.payment_method
    });

    await logWebhook({ rawBody, headers: req.headers, result: recordedTransaction });

    return res.status(201).json({
      success: true,
      message: "Transaction inserted directly into 'transactions' table successfully.",
      transaction: recordedTransaction,
      db_engine: getDbStatus().engine
    });
  } catch (err) {
    console.error('[Memomeir Webhook] Error processing transaction:', err);
    await logWebhook({ rawBody: req.body, headers: req.headers, error: err.message });
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

// Diagnostic logs endpoint
router.get('/webhook/logs', async (req, res) => {
  try {
    const logs = await getWebhookLogs(20);
    res.json({ count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// =============================================================================
// Authentication Endpoints (Multi-User Login & Register)
// =============================================================================

// POST /api/auth/register - Register a new independent user account with Gmail & Password
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, username, phone, password } = req.body;
    const result = await registerUser({
      name,
      email: email || username,
      phone,
      password
    });
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil!',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - Log into an existing account with Gmail & Password
router.post('/auth/login', async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const result = await loginUser({
      email: email || identifier,
      password
    });
    res.json({
      success: true,
      message: 'Login berhasil!',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google - Authenticate using official Google Identity Services credential
router.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Credential Google wajib dikirim.' });
    }
    const result = await authenticateGoogleUser(credential);
    res.json({
      success: true,
      message: 'Berhasil masuk dengan akun Google!',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});


// GET /api/auth/me - Verify session and get active user profile
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. Dashboard API Endpoints (User-Scoped)
// -----------------------------------------------------------------------------

// GET /api/stats - High-level summary cards & category visualizations
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    // If authenticated, isolate stats by user_id unless explicit query overrides
    const user_id = req.query.user_id || (req.user ? req.user.id : undefined);
    const user_name = req.query.user_name;
    const stats = await getDashboardStats({ user_id, user_name });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions - Data table queries with filtering & pagination
router.get('/transactions', optionalAuth, async (req, res) => {
  try {
    const { limit, offset, type, category, search, sortBy, sortOrder } = req.query;
    const user_id = req.query.user_id || (req.user ? req.user.id : undefined);
    const user_name = req.query.user_name;

    const result = await getTransactions({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      type,
      category,
      search,
      sortBy,
      sortOrder,
      user_id,
      user_name
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Member & Multi-User Profiles Endpoints
// -----------------------------------------------------------------------------

// GET /api/users - List all family/household profiles
router.get('/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Create new member profile
router.post('/users', async (req, res) => {
  try {
    const { name, phone, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama anggota wajib diisi.' });
    }
    const user = await createUser({ name, phone, color });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Delete member profile
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Anggota tidak ditemukan.' });
    }
    res.json({ success: true, message: `Anggota #${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions - Manual transaction addition from UI
router.post('/transactions', optionalAuth, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user) {
      payload.user_id = req.user.id;
      payload.user_name = req.user.name;
    }
    const transaction = await insertTransaction(payload);
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

// POST /api/clear - Wipe transactions for clean real database
router.post('/clear', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    await clearAllTransactions(userId);
    const stats = await getDashboardStats({ user_id: userId });
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

      // Check if 2-minute auto-off has expired
      if (status.config.enabled && status.config.autoOffAt) {
        if (Date.now() >= new Date(status.config.autoOffAt).getTime()) {
          status.config.enabled = false;
          status.config.autoOffTriggeredAt = new Date().toISOString();
          delete status.config.autoOffAt;
          fs.writeFileSync(configFile, JSON.stringify(status.config, null, 2));
        }
      }
    } else {
      status.config = {
        enabled: false,
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
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      if (cfg.enabled && cfg.autoOffAt && Date.now() >= new Date(cfg.autoOffAt).getTime()) {
        cfg.enabled = false;
        delete cfg.autoOffAt;
        fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
      }
      return res.json(cfg);
    }
    return res.json({
      enabled: false,
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

    const updates = req.body || {};
    // If enabling bot, set 2-minute auto-off
    if (updates.enabled === true) {
      updates.enabledAt = new Date().toISOString();
      updates.autoOffAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    } else if (updates.enabled === false) {
      delete currentConfig.autoOffAt;
    }

    const newConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2));
    res.json({ success: true, config: newConfig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ocr/scan-receipt - Real Optical Character Recognition on Receipt Photos
router.post('/ocr/scan-receipt', async (req, res) => {
  try {
    const { image, text } = req.body;

    if (text && typeof text === 'string') {
      const parsed = parseReceiptText(text);
      return res.json({
        success: true,
        method: 'text_parse',
        rawText: text,
        data: parsed
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Mohon sertakan gambar struk (base64) atau teks struk.'
      });
    }

    const recognized = await recognizeReceiptImage(image);
    return res.json({
      success: true,
      method: 'ocr_ai',
      rawText: recognized.rawText,
      confidence: recognized.confidence,
      data: {
        amount: recognized.amount,
        merchant: recognized.merchant,
        category: recognized.category,
        payment_method: recognized.payment_method,
        date: recognized.date
      }
    });
  } catch (err) {
    console.error('[OCR Error]:', err);
    return res.status(500).json({
      success: false,
      error: `Gagal membaca gambar struk: ${err.message}`
    });
  }
});

// POST /api/import/statement - Bulk import bank statement transactions
router.post('/import/statement', optionalAuth, async (req, res) => {
  try {
    const { transactions = [], sourceName = 'e-Statement' } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada transaksi untuk diimpor.' });
    }

    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'Saya';

    const inserted = [];
    for (const item of transactions) {
      const created = await insertTransaction({
        type: item.type || 'expense',
        amount: Number(item.amount) || 0,
        category: item.category || 'Miscellaneous',
        payment_method: item.payment_method || 'Bank Transfer',
        description: item.description ? `[${sourceName}] ${item.description}` : `[${sourceName}] Transaksi`,
        date: item.date || new Date().toISOString(),
        user_id: userId,
        user_name: userName
      });
      inserted.push(created);
    }

    return res.json({
      success: true,
      count: inserted.length,
      transactions: inserted
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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

