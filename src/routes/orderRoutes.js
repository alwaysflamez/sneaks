const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Orders endpoints
router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:ref', orderController.getOrderByRef);
router.patch('/:ref/status', orderController.updateOrderStatus);

module.exports = router;

