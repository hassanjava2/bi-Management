const invoiceService = require('../services/invoice.service');

async function list(req, res) {
  try {
    const data = await invoiceService.list({
      type: req.query.type,
      status: req.query.status,
      search: req.query.search,
      customer_id: req.query.customer_id,
      supplier_id: req.query.supplier_id,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit || 50,
      offset: req.query.offset,
    });
    res.json({ success: true, data });
  } catch (e) {
    console.error('[Invoice.list] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    res.json({ success: true, data: invoice });
  } catch (e) {
    console.error('[Invoice.getOne] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function create(req, res) {
  try {
    const created = await invoiceService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    console.error('[Invoice.create] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function addItem(req, res) {
  try {
    const result = await invoiceService.addItem(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    console.error('[Invoice.addItem] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function addPayment(req, res) {
  try {
    const { amount, payment_method, notes } = req.body;
    if (amount == null) return res.status(400).json({ success: false, error: 'MISSING_AMOUNT' });
    const result = await invoiceService.addPayment(req.params.id, amount, payment_method, notes, req.user?.id);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    console.error('[Invoice.addPayment] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'MISSING_STATUS' });
    const updated = await invoiceService.updateStatus(req.params.id, status);
    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[Invoice.updateStatus] Error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = { list, getOne, create, addItem, addPayment, updateStatus };
