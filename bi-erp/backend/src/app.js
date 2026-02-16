/**
 * BI ERP - Backend entry point (Express + PostgreSQL + Socket.io)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');

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
  app.use(requestLogger);
}

// Rate limiting
try {
  const { generalLimiter } = require('./middleware/rateLimit');
  app.use('/api', generalLimiter);
} catch (e) {
  logger.warn('Rate limiter not loaded', { error: e.message });
}

// Request timeout (30 seconds — prevents hung requests)
const { requestTimeout } = require('./middleware/requestTimeout');
app.use('/api', requestTimeout(30000));

// Attach database pool to req.db for routes that need it
app.use((req, res, next) => {
  try {
    const { getDatabase } = require('./config/database');
    req.db = getDatabase();
  } catch (e) {
    // Database not initialized yet
  }
  next();
});

const API_PREFIX = process.env.API_PREFIX || '/api';
app.use(API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  logger.info('Database initialized');

  // Initialize Socket.io
  try {
    const { initSocket } = require('./socket');
    initSocket(server);
    logger.info('Socket.io initialized');
  } catch (e) {
    logger.warn('Socket.io not loaded', { error: e.message });
  }

  // Start scheduler
  try {
    const { startScheduler } = require('./services/scheduler.service');
    startScheduler();
    logger.info('Scheduler started');
  } catch (e) {
    logger.warn('Scheduler not loaded', { error: e.message });
  }

  // Start AI Distribution
  try {
    const aiDistribution = require('./services/ai-distribution/index');
    aiDistribution.start();
    logger.info('AI Task Distribution started');
  } catch (e) {
    logger.warn('AI Distribution not loaded', { error: e.message });
  }

  server.listen(PORT, () => {
    logger.info(`BI ERP API v1.0 running on port ${PORT}`, {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      api: `http://localhost:${PORT}${API_PREFIX}`,
      health: `http://localhost:${PORT}${API_PREFIX}/health`,
    });
  });
}

process.on('SIGTERM', () => {
  logger.warn('SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = { app, server };
