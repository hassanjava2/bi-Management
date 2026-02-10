const supplierRepo = require('../repositories/supplier.repository');

async function list(filters) {
  return supplierRepo.findAll(filters || {});
}

async function getById(id) {
  return supplierRepo.findById(id);
}

async function create(data) {
  return supplierRepo.create(data);
}

async function update(id, data) {
  return supplierRepo.update(id, data);
}

async function remove(id) {
  await supplierRepo.remove(id);
}

module.exports = { list, getById, create, update, remove };
