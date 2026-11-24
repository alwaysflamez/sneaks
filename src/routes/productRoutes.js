const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Categories lookup
router.get('/categories', productController.getCategories);

// Products CRUD
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));
router.put('/:id', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));
router.patch('/:id/inventory', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));
router.delete('/:id', (req, res) => res.status(404).json({ success: false, message: 'Route not available.' }));

module.exports = router;

