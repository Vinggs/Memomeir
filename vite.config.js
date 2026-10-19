import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import cors from 'cors';
import apiRouter from './server/api.js';
import { initDb } from './server/db.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'memomeir-api-backend',
      configureServer: async (server) => {
        try {
          await initDb();
          const app = express();
          app.use(cors());
          app.use(express.json());
          app.use(express.urlencoded({ extended: true }));
          app.use('/api', apiRouter);
          server.middlewares.use(app);
          console.log('[Memomeir] API & WhatsApp Webhook mounted on Vite dev server at /api');
        } catch (err) {
          console.error('[Memomeir] Error initializing backend in Vite:', err);
        }
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  }
});
