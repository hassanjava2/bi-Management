const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventory.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/stats', controller.stats);
router.get('/devices', controller.devices);
router.get('/movements', controller.movements);
router.post('/movements', controller.addMovement);
router.get('/warehouses', async (req, res) => {
  try {
    const { all } = require('../config/database');
    const rows = await all('SELECT * FROM warehouses ORDER BY name').catch(() => []);
    res.json({ success: true, data: rows.length ? rows : [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }] });
  } catch (e) {
    res.json({ success: true, data: [{ id: 'main', name: 'المخزن الرئيسي', location: 'الرئيسي' }] });
  }
});
router.get('/alerts', async (req, res) => {
  try {
    const { all } = require('../config/database');
    const rows = await all('SELECT * FROM products WHERE (is_deleted = FALSE OR is_deleted IS NULL) AND quantity <= min_quantity LIMIT 20').catch(() => []);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);

module.exports = router;
