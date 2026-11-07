const orderService = require('../services/orderService');

const paymentController = {
    verifyMoMo(req, res) {
        try {
            const { orderRef, transactionRef } = req.body;

            if (!orderRef || !transactionRef) {
                return res.status(400).json({
                    success: false,
                    message: 'Both "orderRef" and "transactionRef" are required.'
                });
            }

            const updated = orderService.verifyMoMoPayment(orderRef, transactionRef);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: `Order reference ${orderRef} not found.`
                });
            }

            res.json({
                success: true,
                message: 'MoMo transaction recorded and marked verified.',
                data: updated
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getMoMoDetails(req, res) {
        res.json({
            success: true,
            data: {
                officialMoMoNumber: process.env.MOMO_OFFICIAL_NUMBER || '0256514988',
                networks: ['MTN MoMo', 'Telecel Cash', 'AT Money'],
                accountName: 'SnEAKs Vault Dispatch Desk',
                instructions: 'Transfer the exact order total to 0256514988 using your Full Name as the transaction reference.'
            }
        });
    }
};

module.exports = paymentController;

