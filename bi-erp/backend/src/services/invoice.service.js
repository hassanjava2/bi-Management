const invoiceRepo = require('../repositories/invoice.repository');

async function list(filters) {
  return invoiceRepo.findAll(filters || {});
}

async function getById(id) {
  const invoice = await invoiceRepo.findById(id);
  if (!invoice) return null;
  const items = await invoiceRepo.getItems(id);
  const payments = await invoiceRepo.getPayments(id);
  return { ...invoice, items, payments };
}

async function create(data) {
  return invoiceRepo.create(data);
}

async function addItem(invoiceId, item) {
  return invoiceRepo.addItem(invoiceId, item);
}

async function addPayment(invoiceId, amount, paymentMethod, notes, receivedBy) {
  return invoiceRepo.addPayment(invoiceId, amount, paymentMethod, notes, receivedBy);
}

async function updateStatus(id, status) {
  return invoiceRepo.updateStatus(id, status);
}

module.exports = { list, getById, create, addItem, addPayment, updateStatus };
