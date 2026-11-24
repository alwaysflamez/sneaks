const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAdmin } = require('../middleware/adminAuth');

// Categories lookup
router.get('/categories', productController.getCategories);

// Products CRUD
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', requireAdmin, productController.createProduct);
router.put('/:id', requireAdmin, productController.updateProduct);
router.patch('/:id/inventory', requireAdmin, productController.updateInventory);
router.delete('/:id', requireAdmin, productController.deleteProduct);

module.exports = router;

