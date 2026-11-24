const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment details only. Verification is disabled until provider-side confirmation exists.
router.get('/momo/info', paymentController.getMoMoDetails);
router.post('/momo/verify', (req, res) => res.status(503).json({
    success: false,
    message: 'MoMo verification is unavailable. Payment is confirmed by the dispatch desk only.'
}));

module.exports = router;

