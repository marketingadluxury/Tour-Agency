import express from 'express';
import path from 'path';
import cors from 'cors';
import './server/config/env.js';

import uploadRoutes from './server/routes/uploadRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import feedbackRoutes from './server/routes/feedbackRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';
import metaCapiRoutes from './server/routes/metaCapiRoutes.js';
import metaMessengerRoutes from './server/routes/metaMessengerRoutes.js';
import pancakeRoutes from './server/routes/pancakeRoutes.js';
import botcakeRoutes from './server/routes/botcakeRoutes.js';
import poscakeRoutes from './server/routes/poscakeRoutes.js';
import keepAliveRoutes from './server/routes/keepAliveRoutes.js';
import taxRoutes from './server/routes/taxRoutes.js';
import woocommerceRoutes from './server/routes/woocommerceRoutes.js';
import googleDriveConfigRoutes from './server/routes/googleDriveConfigRoutes.js';
import { getResolvedSupabaseConfig } from './server/services/supabaseService.js';
import { errorHandler } from './server/middleware/errorHandler.js';

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb', type: ['text/*', 'application/*+json'] }));

// Health Check API
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Dynamic Public Config API for Frontend
app.get('/api/config', (req, res) => {
  const { supabaseUrl, anonKey } = getResolvedSupabaseConfig();
  res.json({
    supabaseUrl,
    supabaseAnonKey: anonKey
  });
});

// API Routes
app.use('/', uploadRoutes);
app.use('/', adminRoutes);
app.use('/', feedbackRoutes);
app.use('/', aiRoutes);
app.use('/', metaCapiRoutes);
app.use('/', metaMessengerRoutes);
app.use('/', pancakeRoutes);
app.use('/', botcakeRoutes);
app.use('/', poscakeRoutes);
app.use('/', keepAliveRoutes);
app.use('/', taxRoutes);
app.use('/', woocommerceRoutes);
app.use('/', googleDriveConfigRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
