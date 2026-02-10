/**
 * BI ERP - Auth controller
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { asyncHandler } = require('../middleware/errorHandler');

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'MISSING_CREDENTIALS', message: 'يجب إدخال البريد وكلمة المرور' });
  }
  const result = await authService.login(email, password, req.ip);
  if (result.error) {
    return res.status(401).json({ success: false, error: result.error, message: result.message });
  }
  res.json({
    success: true,
    data: { user: result.user, token: result.token, refresh_token: result.refreshToken },
  });
}

async function logout(req, res) {
  await authService.logout(req.user.id, req.ip);
  res.json({ success: true, message: 'تم تسجيل الخروج' });
}

async function refreshToken(req, res) {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ success: false, error: 'MISSING_TOKEN' });
  }
  const result = await authService.refreshToken(refresh_token);
  if (result.error) {
    return res.status(401).json({ success: false, error: result.error, message: result.message });
  }
  res.json({ success: true, data: { token: result.token, refresh_token: result.refreshToken } });
}

async function me(req, res) {
  const user = await userService.getUser(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
  res.json({ success: true, data: user });
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'كلمة المرور 8 أحرف على الأقل' });
  }
  const result = await authService.changePassword(req.user.id, current_password, new_password, req.ip);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  res.json({ success: true, message: result.message });
}

module.exports = {
  login,
  logout,
  refreshToken,
  me,
  changePassword,
};
