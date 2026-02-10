const customerRepo = require('../repositories/customer.repository');

async function list(filters) {
  return customerRepo.findAll(filters || {});
}

async function getById(id) {
  return customerRepo.findById(id);
}

async function create(data) {
  return customerRepo.create(data);
}

async function update(id, data) {
  return customerRepo.update(id, data);
}

async function remove(id) {
  await customerRepo.remove(id);
}

async function getStats() {
  const { get } = require('../config/database');
  const total = await get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL)').then(r => r?.c || 0);
  const withBalance = await get('SELECT COUNT(*) as c FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL) AND balance > 0').then(r => r?.c || 0);
  const receivables = await get('SELECT COALESCE(SUM(balance), 0) as s FROM customers WHERE (is_deleted = FALSE OR is_deleted IS NULL) AND balance > 0').then(r => r?.s || 0);
  return { total, with_balance: withBalance, total_receivables: receivables };
}

module.exports = { list, getById, create, update, remove, getStats };
