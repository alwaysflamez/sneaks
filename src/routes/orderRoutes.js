const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAdmin } = require('../middleware/adminAuth');

// Orders endpoints
router.post('/', orderController.createOrder);
router.get('/:ref', orderController.getOrderByRef);
router.get('/', requireAdmin, orderController.getAllOrders);
router.patch('/:ref/status', requireAdmin, orderController.updateOrderStatus);

module.exports = router;

