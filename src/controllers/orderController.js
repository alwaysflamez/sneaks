const orderService = require('../services/orderService');

const orderController = {
    createOrder(req, res) {
        try {
            const order = orderService.create(req.body);
            res.status(201).json({
                success: true,
                message: 'Order placed successfully.',
                data: order
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    getAllOrders(req, res) {
        try {
            const { status, search, limit, page } = req.query;
            const result = orderService.getAll({ status, search, limit, page });
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getOrderByRef(req, res) {
        try {
            const order = orderService.getPublicTracking(req.params.ref);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: `Order reference ${req.params.ref} not found.`
                });
            }
            res.json({ success: true, data: order });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateOrderStatus(req, res) {
        try {
            const { status } = req.body;
            if (!status) {
                return res.status(400).json({ success: false, message: 'Status field is required.' });
            }

            const updated = orderService.updateStatus(req.params.ref, status);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: `Order reference ${req.params.ref} not found.`
                });
            }

            res.json({
                success: true,
                message: `Order status updated to "${status}".`,
                data: updated
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

module.exports = orderController;

