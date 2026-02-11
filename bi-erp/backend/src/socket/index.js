/**
 * BI Management - Socket.io Setup
 * Real-time communication
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const { get } = require('../config/database');
const notificationService = require('../services/notification.service');

function initSocket(httpServer) {
    const corsOrigin = process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:5173');
    const io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);
        
        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        // Get user
        const user = await get(
            `SELECT id, full_name, role, security_level 
             FROM users WHERE id = ? AND is_active = TRUE`,
            [decoded.id]
        );

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;
        next();
    });

    // Connection handler
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        
        console.log(`[Socket] User connected: ${socket.user.full_name}`);

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Join department room
        if (socket.user.department_id) {
            socket.join(`department:${socket.user.department_id}`);
        }

        // Join role room
        socket.join(`role:${socket.user.role}`);

        // Handle task status updates
        socket.on('task:statusUpdate', (data) => {
            // Broadcast to relevant users
            io.to(`user:${data.assigned_to}`).emit('task:updated', data);
        });

        // Handle typing indicators for chat
        socket.on('chat:typing', (data) => {
            socket.to(`conversation:${data.conversation_id}`).emit('chat:userTyping', {
                user_id: userId,
                user_name: socket.user.full_name
            });
        });

        // Handle notification read
        socket.on('notification:read', (notificationId) => {
            notificationService.markAsRead(notificationId, userId);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.user.full_name}`);
        });
    });

    // Set io instance in notification service for real-time notifications
    notificationService.setSocketIO(io);

    console.log('[+] Socket.io initialized');
    
    return io;
}

module.exports = { initSocket };
