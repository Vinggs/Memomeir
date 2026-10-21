import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from '../server/api.js';
import { initDb } from '../server/db.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.text({ type: '*/*', limit: '25mb' }));

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
