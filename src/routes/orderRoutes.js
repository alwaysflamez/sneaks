const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Orders endpoints
router.post('/', orderController.createOrder);
router.get('/:ref', orderController.getOrderByRef);
router.get('/', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));
router.patch('/:ref/status', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));

module.exports = router;

