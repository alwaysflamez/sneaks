const paymentController = {
    verifyMoMo(req, res) {
        res.status(503).json({
            success: false,
            message: 'MoMo verification is unavailable. Payment is confirmed by the dispatch desk only.'
        });
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

