const customerService = require('../services/customer.service');

async function list(req, res) {
  const data = await customerService.list({
    search: req.query.search,
    type: req.query.type,
    page: req.query.page,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  res.json({ success: true, data });
}

async function getOne(req, res) {
  const customer = await customerService.getById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  if (customer.addresses && typeof customer.addresses === 'string') {
    try { customer.addresses = JSON.parse(customer.addresses); } catch (_) {}
  }
  res.json({ success: true, data: customer });
}

async function create(req, res) {
  const created = await customerService.create({ ...req.body, created_by: req.user?.id });
  res.status(201).json({ success: true, data: created });
}

async function update(req, res) {
  const updated = await customerService.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: updated });
}

async function remove(req, res) {
  await customerService.remove(req.params.id);
  res.json({ success: true });
}

async function stats(req, res) {
  const data = await customerService.getStats();
  res.json({ success: true, data });
}

module.exports = { list, getOne, create, update, remove, stats };
