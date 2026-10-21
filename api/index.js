import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from '../server/api.js';
import { initDb } from '../server/db.js';

dotenv.config();

const app = express();

app.use(cors());

// Parse JSON with verify callback to capture raw string if JSON parsing fails
app.use(express.json({
  limit: '25mb',
  verify: (req, res, buf, encoding) => {
    req.rawBufferString = buf ? buf.toString(encoding || 'utf8') : '';
  }
}));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.text({ type: '*/*', limit: '25mb' }));

// Gracefully recover if MacroDroid sent plain text with Content-Type: application/json
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    req.body = { text: req.rawBufferString || err.body || '' };
    return next();
  }
  next(err);
});

// Serverless DB lazy initialization
let dbInitPromise = null;
app.use(async (req, res, next) => {
  try {
    if (!dbInitPromise) {
      dbInitPromise = initDb();
    }
    await dbInitPromise;
  } catch (err) {
    console.error('[Vercel DB Init Error]:', err.message);
  }
  next();
});

// Mount routes for both '/api' and '/' to handle Vercel rewrites reliably
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
