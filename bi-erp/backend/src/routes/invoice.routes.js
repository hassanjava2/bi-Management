const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.post('/:id/items', controller.addItem);
router.post('/:id/payments', controller.addPayment);
router.put('/:id/status', controller.updateStatus);

module.exports = router;
