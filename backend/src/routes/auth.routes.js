/**
 * BI Management - Auth Routes
 * مسارات المصادقة
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { auth } = require('../middleware/auth');
const { logAudit } = require('../services/audit.service');

/**
 * POST /api/auth/login
 * تسجيل الدخول
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_CREDENTIALS',
                message: 'يجب إدخال البريد وكلمة المرور'
            });
        }

        const result = await authService.login(email, password, req.ip);

        if (result.error) {
            return res.status(401).json({
                success: false,
                error: result.error,
                message: result.message
            });
        }

        res.json({
            success: true,
            data: {
                user: result.user,
                token: result.token,
                refresh_token: result.refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'LOGIN_ERROR',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * تسجيل الخروج
 */
router.post('/logout', auth, (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        authService.logout(req.user.id, token, req.ip);

        res.json({
            success: true,
            message: 'تم تسجيل الخروج'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auth/refresh-token
 * تجديد التوكن
 */
router.post('/refresh-token', (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_TOKEN'
            });
        }

        const result = authService.refreshToken(refresh_token);

        if (result.error) {
            return res.status(401).json({
                success: false,
                error: result.error,
                message: result.message
            });
        }

        res.json({
            success: true,
            data: {
                token: result.token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auth/me
 * جلب بيانات المستخدم الحالي
 */
router.get('/me', auth, (req, res) => {
    try {
        const user = userService.getUser(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'USER_NOT_FOUND'
            });
        }

        // Remove sensitive data
        const { password_hash, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/auth/change-password
 * تغيير كلمة المرور
 */
router.put('/change-password', auth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'WEAK_PASSWORD',
                message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
            });
        }

        const result = await authService.changePassword(
            req.user.id,
            current_password,
            new_password,
            req.ip
        );

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error,
                message: result.message
            });
        }

        res.json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/auth/update-profile
 * تحديث الملف الشخصي
 */
router.put('/update-profile', auth, (req, res) => {
    try {
        const { full_name, phone, avatar_url } = req.body;
        
        const result = userService.updateUser(req.user.id, {
            full_name,
            phone,
            avatar_url
        });

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
