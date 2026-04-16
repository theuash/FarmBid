const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT } = require('../middleware/auth');

// POST /api/payments/create-order
router.post('/create-order', authenticateJWT, paymentController.createOrder);

// POST /api/payments/verify-payment
router.post('/verify-payment', authenticateJWT, paymentController.verifyPayment);

module.exports = router;
