/**
 * BI Management System - Backend API
 * Main Application Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');

// Import database
const { initDatabase, saveDatabase } = require('./config/database');
const { initializeDatabase } = require('./scripts/init-database');

// Import routes and middleware
const routes = require('./routes');

// Import scheduler
const { startScheduler, stopScheduler } = require('./services/scheduler.service');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimit');
const { initSocket } = require('./socket');

// Create Express app
const app = express();

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for API
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

// Compression
app.use(compression());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', generalLimiter);

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize database with schema and seeds
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            console.error('[!] Database initialization failed');
            process.exit(1);
        }
        console.log('[+] Database initialized with schema');

        // Permission system is ready to use
        console.log('[+] Permission system ready');

        // Initialize Socket.io
        const io = initSocket(server);

        // Start scheduler for background tasks
        startScheduler();

        // Start AI Task Distribution (event bus + task generator + assignment)
        try {
            const aiDistribution = require('./services/ai-distribution/index');
            aiDistribution.start();
            console.log('[+] AI Task Distribution started');
        } catch (e) {
            console.warn('[!] AI Task Distribution failed to start:', e.message);
        }

        // Start listening
        server.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`[+] BI Management API v2.0`);
            console.log(`[+] Server running on port ${PORT}`);
            console.log(`[+] Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50));
            console.log(`[*] API: http://localhost:${PORT}/api`);
            console.log(`[*] Health: http://localhost:${PORT}/api/health`);
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('[!] Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[!] SIGTERM received. Shutting down gracefully...');
    saveDatabase();
    server.close(() => {
        console.log('[+] Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();

module.exports = { app, server };
