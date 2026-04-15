const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payments/create-order
router.post('/create-order', paymentController.createOrder);

// POST /api/payments/verify-payment
router.post('/verify-payment', paymentController.verifyPayment);

module.exports = router;
