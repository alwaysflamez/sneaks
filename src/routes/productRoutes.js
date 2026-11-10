const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Categories lookup
router.get('/categories', productController.getCategories);

// Products CRUD
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/inventory', productController.updateInventory);
router.delete('/:id', productController.deleteProduct);

module.exports = router;

