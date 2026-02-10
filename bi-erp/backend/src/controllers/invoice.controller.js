const invoiceService = require('../services/invoice.service');

async function list(req, res) {
  const data = await invoiceService.list({
    type: req.query.type,
    status: req.query.status,
    customer_id: req.query.customer_id,
    supplier_id: req.query.supplier_id,
    limit: req.query.limit || 50,
    offset: req.query.offset,
  });
  res.json({ success: true, data });
}

async function getOne(req, res) {
  const invoice = await invoiceService.getById(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: invoice });
}

async function create(req, res) {
  const created = await invoiceService.create({ ...req.body, created_by: req.user?.id });
  res.status(201).json({ success: true, data: created });
}

async function addItem(req, res) {
  const result = await invoiceService.addItem(req.params.id, req.body);
  res.status(201).json({ success: true, data: result });
}

async function addPayment(req, res) {
  const { amount, payment_method, notes } = req.body;
  if (amount == null) return res.status(400).json({ success: false, error: 'MISSING_AMOUNT' });
  const result = await invoiceService.addPayment(req.params.id, amount, payment_method, notes, req.user?.id);
  res.status(201).json({ success: true, data: result });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, error: 'MISSING_STATUS' });
  const updated = await invoiceService.updateStatus(req.params.id, status);
  res.json({ success: true, data: updated });
}

module.exports = { list, getOne, create, addItem, addPayment, updateStatus };
