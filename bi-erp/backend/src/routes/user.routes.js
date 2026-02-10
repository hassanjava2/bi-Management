/**
 * BI ERP - User routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');
const { hasPermission, adminOnly } = require('../middleware/permissions');

router.use(auth);

router.get('/', adminOnly, userController.list);
router.get('/:id', adminOnly, userController.getOne);
router.post('/', hasPermission('users.create'), userController.create);
router.put('/:id', hasPermission('users.update'), userController.update);
router.delete('/:id', hasPermission('users.delete'), userController.remove);

module.exports = router;
