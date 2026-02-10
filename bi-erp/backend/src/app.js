/**
 * BI ERP - Backend entry point (Express + PostgreSQL + Socket.io)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');

const { initDatabase } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
try {
  const { generalLimiter } = require('./middleware/rateLimit');
  app.use('/api', generalLimiter);
} catch (e) {
  console.warn('[!] Rate limiter not loaded:', e.message);
}

const API_PREFIX = process.env.API_PREFIX || '/api';
app.use(API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();

  // Initialize Socket.io
  try {
    const { initSocket } = require('./socket');
    initSocket(server);
  } catch (e) {
    console.warn('[!] Socket.io not loaded:', e.message);
  }

  // Start scheduler
  try {
    const { startScheduler } = require('./services/scheduler.service');
    startScheduler();
  } catch (e) {
    console.warn('[!] Scheduler not loaded:', e.message);
  }

  // Start AI Distribution
  try {
    const aiDistribution = require('./services/ai-distribution/index');
    aiDistribution.start();
    console.log('[+] AI Task Distribution started');
  } catch (e) {
    console.warn('[!] AI Distribution not loaded:', e.message);
  }

  server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('[+] BI ERP API v1.0');
    console.log(`[+] Server running on port ${PORT}`);
    console.log(`[+] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
    console.log(`[*] API: http://localhost:${PORT}${API_PREFIX}`);
    console.log(`[*] Health: http://localhost:${PORT}${API_PREFIX}/health`);
    console.log('='.repeat(50));
  });
}

process.on('SIGTERM', () => {
  console.log('[!] SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { app, server };
