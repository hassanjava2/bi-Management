const supplierService = require('../services/supplier.service');

async function list(req, res) {
  const data = await supplierService.list({
    search: req.query.search,
    type: req.query.type,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  res.json({ success: true, data });
}

async function getOne(req, res) {
  const supplier = await supplierService.getById(req.params.id);
  if (!supplier) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: supplier });
}

async function create(req, res) {
  const created = await supplierService.create(req.body);
  res.status(201).json({ success: true, data: created });
}

async function update(req, res) {
  const updated = await supplierService.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: updated });
}

async function remove(req, res) {
  await supplierService.remove(req.params.id);
  res.json({ success: true });
}

module.exports = { list, getOne, create, update, remove };
