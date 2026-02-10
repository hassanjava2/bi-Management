/**
 * BI ERP - User controller
 */

const userService = require('../services/user.service');
const { asyncHandler } = require('../middleware/errorHandler');

async function list(req, res) {
  const filters = {
    department_id: req.query.department_id,
    role: req.query.role,
    is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    search: req.query.search,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
  };
  const users = await userService.getUsers(filters, req.user.security_level ?? 1);
  const total = await userService.getUserCount(filters);
  res.json({ success: true, data: users, pagination: { total } });
}

async function getOne(req, res) {
  const user = await userService.getUser(req.params.id, req.user.security_level ?? 1);
  if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
  res.json({ success: true, data: user });
}

async function create(req, res) {
  const user = await userService.createUser(req.body, req.user.id);
  res.status(201).json({ success: true, data: user });
}

async function update(req, res) {
  const user = await userService.updateUser(req.params.id, req.body, req.user.id);
  res.json({ success: true, data: user });
}

async function remove(req, res) {
  await userService.deleteUser(req.params.id);
  res.json({ success: true, message: 'تم التعطيل' });
}

module.exports = { list, getOne, create, update, remove };
