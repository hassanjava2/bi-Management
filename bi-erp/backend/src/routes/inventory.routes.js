const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/stats', controller.stats);
router.get('/movements', controller.movements);
router.post('/movements', controller.addMovement);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);

module.exports = router;
