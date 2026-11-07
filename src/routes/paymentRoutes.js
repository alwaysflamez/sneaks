const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment verification & details
router.get('/momo/info', paymentController.getMoMoDetails);
router.post('/momo/verify', paymentController.verifyMoMo);

module.exports = router;

