import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRouter from './api.js';
import { initDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Database (PostgreSQL or localized fallback)
await initDb();

// Mount API routes
app.use('/api', apiRouter);

// Serve built frontend assets in production if dist exists
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback all unknown GET routes to index.html (SPA)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Memomeir API Server</title></head>
        <body style="font-family:sans-serif; background:#09090b; color:#fafafa; padding:40px;">
          <h1>Memomeir Backend Service</h1>
          <p>API & WhatsApp Webhook online at <code>/api/webhook/transaction</code>.</p>
          <p>Run <code>npm run dev</code> for the Vite dashboard frontend.</p>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`  MEMOMEIR BACKEND SERVICE ACTIVE`);
  console.log(`  Server:           http://localhost:${PORT}`);
  console.log(`  WhatsApp Webhook: http://localhost:${PORT}/api/webhook/transaction`);
  console.log(`  Dashboard API:    http://localhost:${PORT}/api/stats`);
  console.log(`======================================================\n`);

  if (process.env.AUTO_START_BOT === 'true') {
    try {
      const { startWhatsAppBot } = await import('./whatsapp/bot.js');
      console.log('[Auto-Start] Launching WhatsApp Bot Service in background...');
      startWhatsAppBot().catch(err => {
        console.error('[Auto-Start Bot Error]:', err);
      });
    } catch (err) {
      console.error('[Auto-Start Bot Import Error]:', err);
    }
  }
});

export default app;

