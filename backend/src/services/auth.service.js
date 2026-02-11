/**
 * BI Management - Auth Service
 * خدمة المصادقة
 */

const bcrypt = require('bcryptjs');
const { run, get, all } = require('../config/database');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { generateId, now } = require('../utils/helpers');
const { encrypt } = require('../utils/encryption');
const { logAudit, logSecurityEvent, countFailedLogins } = require('./audit.service');

/**
 * Login user
 */
async function login(email, password, ipAddress) {
    // Get user (support both email and username)
    const user = await get(`
        SELECT id, username, email, password_hash, full_name, 
               role, role_id, security_level, is_active,
               failed_login_attempts, locked_until
        FROM users WHERE email = ? OR username = ?
    `, [email, email]);

    if (!user) {
        logAudit({
            action: 'LOGIN_FAILED',
            new_values: { email, reason: 'USER_NOT_FOUND' },
            ip_address: ipAddress
        });
        return { error: 'INVALID_CREDENTIALS', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    // Check if locked
    if (user.locked_until) {
        const lockedUntil = new Date(user.locked_until);
        if (new Date() < lockedUntil) {
            const remainingMinutes = Math.ceil((lockedUntil - new Date()) / 60000);
            return { 
                error: 'ACCOUNT_LOCKED', 
                message: `الحساب مقفل. حاول مرة أخرى بعد ${remainingMinutes} دقيقة`,
                locked_until: user.locked_until
            };
        }
        // Lock period expired, reset
        await run(`UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?`, [user.id]);
    }

    // Check if active
    if (!user.is_active) {
        return { error: 'ACCOUNT_INACTIVE', message: 'الحساب معطل. تواصل مع مدير النظام' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
        // Increment failed attempts
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        let lockUntil = null;

        if (newAttempts >= 5) {
            lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
            logSecurityEvent({
                user_id: user.id,
                event_type: 'ACCOUNT_LOCKED',
                severity: 'high',
                description: `Account locked after ${newAttempts} failed login attempts`
            });
        }

        await run(`
            UPDATE users SET 
                failed_login_attempts = ?,
                locked_until = ?
            WHERE id = ?
        `, [newAttempts, lockUntil, user.id]);

        logAudit({
            user_id: user.id,
            action: 'LOGIN_FAILED',
            new_values: { reason: 'INVALID_PASSWORD', attempts: newAttempts },
            ip_address: ipAddress
        });

        return { error: 'INVALID_CREDENTIALS', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    // Success - reset failed attempts
    await run(`
        UPDATE users SET 
            failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = ?
        WHERE id = ?
    `, [now(), user.id]);

    // Generate tokens
    const tokenPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        security_level: user.security_level
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Create session
    const sessionId = generateId();
    try {
        await run(`
            INSERT INTO user_sessions (id, user_id, token_hash, ip_address, expires_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')
        `, [sessionId, user.id, encrypt(token), ipAddress]);
    } catch (e) {
        // Ignore session creation errors
        console.warn('[Auth] Could not create session:', e.message);
    }

    // Log success
    logAudit({
        user_id: user.id,
        action: 'LOGIN',
        ip_address: ipAddress
    });

    return {
        success: true,
        token,
        refreshToken,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            security_level: user.security_level
        }
    };
}

/**
 * Logout user
 */
async function logout(userId, token, ipAddress) {
    // Revoke session
    try {
        await run(`
            UPDATE user_sessions SET 
                is_active = 0
            WHERE user_id = ? AND is_active = 1
        `, [userId]);
    } catch (e) {
        console.warn('[Auth] Could not revoke session:', e.message);
    }

    logAudit({
        user_id: userId,
        action: 'LOGOUT',
        ip_address: ipAddress
    });

    return { success: true };
}

/**
 * Refresh token
 */
async function refreshToken(refreshTokenStr) {
    const decoded = verifyToken(refreshTokenStr);
    
    if (!decoded) {
        return { error: 'INVALID_TOKEN', message: 'Invalid refresh token' };
    }

    // Get user
    const user = await get(`
        SELECT id, email, role, security_level, is_active
        FROM users WHERE id = ?
    `, [decoded.id]);

    if (!user || !user.is_active) {
        return { error: 'USER_INVALID', message: 'User not found or inactive' };
    }

    // Generate new token
    const newToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        security_level: user.security_level
    });

    return {
        success: true,
        token: newToken
    };
}

/**
 * Change password
 */
async function changePassword(userId, currentPassword, newPassword, ipAddress) {
    // Get current password
    const user = await get(`SELECT password_hash FROM users WHERE id = ?`, [userId]);

    if (!user) {
        return { error: 'USER_NOT_FOUND' };
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValid) {
        logSecurityEvent({
            user_id: userId,
            event_type: 'INVALID_PASSWORD_CHANGE_ATTEMPT',
            severity: 'medium',
            description: 'Failed password change - wrong current password'
        });
        return { error: 'INVALID_PASSWORD', message: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedPassword, userId]);

    // Revoke all sessions
    try {
        await run(`
            UPDATE user_sessions SET 
                is_active = 0
            WHERE user_id = ?
        `, [userId]);
    } catch (e) {
        console.warn('[Auth] Could not revoke sessions on password change:', e.message);
    }

    logAudit({
        user_id: userId,
        action: 'PASSWORD_CHANGED',
        ip_address: ipAddress
    });

    return { success: true, message: 'Password changed successfully' };
}

module.exports = {
    login,
    logout,
    refreshToken,
    changePassword
};
