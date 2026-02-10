/**
 * BI ERP - User service (business logic, async)
 */

const bcrypt = require('bcryptjs');
const { SECURITY_LEVELS } = require('../config/constants');
const userRepo = require('../repositories/user.repository');
const { generateId } = require('../utils/helpers');
const { encrypt } = require('../utils/encryption');

async function createUser(data, createdBy) {
  const id = generateId();
  const count = await userRepo.count({});
  const employeeCode = `EMP${String(count + 1).padStart(3, '0')}`;
  const passwordHash = await bcrypt.hash(data.password, 12);
  const username = data.username || (data.email ? data.email.replace(/@.*$/, '').replace(/\s+/g, '_') : `user_${id.slice(0, 8)}`);
  const salaryEncrypted = data.salary != null ? encrypt(String(data.salary)) : null;

  await userRepo.create({
    id,
    columns: [
      'id', 'username', 'email', 'password_hash', 'full_name', 'phone', 'role', 'role_id', 'is_active',
      'employee_code', 'department_id', 'position_id', 'security_level', 'hire_date', 'created_by', 'salary_encrypted',
    ],
    values: [
      id, username, data.email, passwordHash, data.full_name || null, data.phone || null,
      data.role || 'employee', data.role_id || null, true, employeeCode,
      data.department_id || null, data.position_id || null, data.security_level ?? 1,
      data.hire_date || null, createdBy || null, salaryEncrypted,
    ],
  });
  return getUser(id, SECURITY_LEVELS.ADMIN);
}

async function getUser(userId, requesterLevel = 1) {
  const user = await userRepo.findById(userId);
  if (!user) return null;
  const response = {
    id: user.id,
    employee_code: user.employee_code,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    department_id: user.department_id,
    department_name: user.department_name,
    position_id: user.position_id,
    position_title: user.position_title,
    role: user.role,
    security_level: user.security_level ?? 1,
    hire_date: user.hire_date,
    is_active: !!user.is_active,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
  };
  if (requesterLevel >= SECURITY_LEVELS.HR_ACCOUNTANT && user.salary_encrypted) {
    try {
      const { decrypt } = require('../utils/encryption');
      response.salary = decrypt(user.salary_encrypted);
    } catch (_) {}
  }
  return response;
}

async function getUsers(filters = {}, requesterLevel = 1) {
  const users = await userRepo.findAll(filters);
  return users.map((u) => ({
    id: u.id,
    employee_code: u.employee_code,
    email: u.email,
    full_name: u.full_name,
    phone: u.phone,
    department_id: u.department_id,
    department_name: u.department_name,
    position_id: u.position_id,
    position_title: u.position_title,
    role: u.role,
    security_level: u.security_level,
    hire_date: u.hire_date,
    is_active: !!u.is_active,
    last_login_at: u.last_login_at,
  }));
}

async function updateUser(userId, data, updatedBy) {
  const updates = {};
  const allowed = ['full_name', 'phone', 'department_id', 'position_id', 'role', 'role_id', 'security_level', 'is_active', 'avatar_url'];
  for (const k of allowed) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  if (data.salary !== undefined) {
    updates.salary_encrypted = encrypt(String(data.salary));
  }
  await userRepo.update(userId, updates);
  return getUser(userId, SECURITY_LEVELS.ADMIN);
}

async function deleteUser(userId) {
  await userRepo.update(userId, { is_active: false });
  return { success: true };
}

async function getUserCount(filters) {
  return userRepo.count(filters || {});
}

module.exports = {
  createUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  getUserCount,
};
