/**
 * BI ERP - Auth service (JWT + refresh tokens, async)
 */

const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { hashToken } = require('../utils/encryption');
const userRepo = require('../repositories/user.repository');
const { logAudit } = require('./audit.service');

async function login(emailOrUsername, password, ipAddress) {
  const user = await userRepo.findByEmailOrUsername(emailOrUsername);
  if (!user) {
    await logAudit({ action: 'LOGIN_FAILED', new_value: { email: emailOrUsername, reason: 'USER_NOT_FOUND' }, ip_address: ipAddress });
    return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  if (user.locked_until) {
    const lockedUntil = new Date(user.locked_until);
    if (new Date() < lockedUntil) {
      return { error: 'ACCOUNT_LOCKED', message: 'Account is locked. Try again later.', locked_until: user.locked_until };
    }
  }

  if (!user.is_active) {
    return { error: 'ACCOUNT_INACTIVE', message: 'Account is deactivated' };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
    await userRepo.updateLoginFailed(user.id, attempts, lockedUntil);
    await logAudit({ user_id: user.id, action: 'LOGIN_FAILED', new_value: { reason: 'INVALID_PASSWORD', attempts }, ip_address: ipAddress });
    return { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  await userRepo.updateLoginSuccess(user.id);

  const payload = { id: user.id, email: user.email, username: user.username, role: user.role, security_level: user.security_level || 1 };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await run(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user.id, refreshHash, expiresAt.toISOString()]
  );

  await logAudit({ user_id: user.id, action: 'LOGIN', ip_address: ipAddress });

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
      security_level: user.security_level || 1,
    },
  };
}

async function logout(userId, ipAddress) {
  await run(`UPDATE user_sessions SET is_active = 0 WHERE user_id = ?`, [userId]);
  await run(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`, [userId]);
  await logAudit({ user_id: userId, action: 'LOGOUT', ip_address: ipAddress });
  return { success: true };
}

async function refreshToken(refreshTokenStr) {
  const decoded = verifyToken(refreshTokenStr);
  if (!decoded || decoded.expired || decoded.invalid) {
    return { error: 'INVALID_TOKEN', message: 'Invalid refresh token' };
  }
  const user = await get(`SELECT id, email, username, role, security_level, is_active FROM users WHERE id = ?`, [decoded.id]);
  if (!user || !user.is_active) {
    return { error: 'USER_INVALID', message: 'User not found or inactive' };
  }
  const hash = hashToken(refreshTokenStr);
  const row = await get(`SELECT id FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > CURRENT_TIMESTAMP AND revoked_at IS NULL`, [user.id, hash]);
  if (!row) {
    return { error: 'INVALID_TOKEN', message: 'Refresh token revoked or expired' };
  }
  await run(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`, [row.id]);
  const payload = { id: user.id, email: user.email, username: user.username, role: user.role, security_level: user.security_level || 1 };
  const newAccess = generateToken(payload);
  const newRefresh = generateRefreshToken(payload);
  const newHash = hashToken(newRefresh);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await run(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, [user.id, newHash, expiresAt.toISOString()]);
  return { success: true, token: newAccess, refreshToken: newRefresh };
}

async function changePassword(userId, currentPassword, newPassword, ipAddress) {
  const user = await get(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
  if (!user) return { error: 'USER_NOT_FOUND' };
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    await logAudit({ user_id: userId, action: 'PASSWORD_CHANGE_FAILED', ip_address: ipAddress });
    return { error: 'INVALID_PASSWORD', message: 'Current password is incorrect' };
  }
  const hashed = await bcrypt.hash(newPassword, 12);
  await userRepo.updatePassword(userId, hashed);
  await run(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`, [userId]);
  await logAudit({ user_id: userId, action: 'PASSWORD_CHANGED', ip_address: ipAddress });
  return { success: true, message: 'Password changed successfully' };
}

module.exports = { login, logout, refreshToken, changePassword };
