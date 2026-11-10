const productService = require('../services/productService');

const productController = {
    getAllProducts(req, res) {
        try {
            const { category, search, sort, minPrice, maxPrice } = req.query;
            const products = productService.getAll({ category, search, sort, minPrice, maxPrice });
            res.json({
                success: true,
                count: products.length,
                data: products
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getProductById(req, res) {
        try {
            const product = productService.getById(req.params.id);
            if (!product) {
                return res.status(404).json({ success: false, message: `Sneaker with ID ${req.params.id} not found.` });
            }
            res.json({ success: true, data: product });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getCategories(req, res) {
        try {
            const categories = productService.getCategories();
            res.json({ success: true, data: categories });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createProduct(req, res) {
        try {
            const newProduct = productService.create(req.body);
            res.status(201).json({
                success: true,
                message: 'Sneaker product created successfully.',
                data: newProduct
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    updateProduct(req, res) {
        try {
            const updated = productService.update(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ success: false, message: `Sneaker with ID ${req.params.id} not found.` });
            }
            res.json({
                success: true,
                message: 'Sneaker product updated successfully.',
                data: updated
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    updateInventory(req, res) {
        try {
            const updated = productService.updateInventory(req.params.id, req.body.inventory);
            if (!updated) {
                return res.status(404).json({ success: false, message: `Sneaker with ID ${req.params.id} not found.` });
            }
            res.json({
                success: true,
                message: 'Sneaker inventory updated successfully.',
                data: updated
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    deleteProduct(req, res) {
        try {
            const deleted = productService.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: `Sneaker with ID ${req.params.id} not found.` });
            }
            res.json({
                success: true,
                message: 'Sneaker removed from catalog.',
                data: deleted
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = productController;

