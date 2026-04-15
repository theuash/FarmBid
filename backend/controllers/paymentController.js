const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

// 1. CREATE RAZORPAY ORDER
exports.createOrder = async (req, res) => {
  try {
    const { amount, userId } = req.body;
    
    if (!amount || !userId) {
      return res.status(400).json({ success: false, message: 'Amount and userId are required' });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Razorpay strictly expects an integer in paise (INR)
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 2. VERIFY PAYMENT AND TOP-UP WALLET
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      userId, 
      amount, // Standard INR amount passed by frontend
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'YourKeySecretHere';

    // 5. SECURITY: Verify signature to prevent fake payments
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Invalid Payment Signature' });
    }

    // 3. WALLET TOP-UP
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found for this user.' });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    wallet.balance = balanceAfter;
    wallet.availableBalance += amount;
    await wallet.save();

    // 4. TRANSACTION MODEL CREATION
    const transaction = await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: 'credit',
      amount,
      currency: 'INR',
      balanceBefore,
      balanceAfter,
      description: 'Wallet top-up via Razorpay',
      referenceId: razorpay_order_id,
      referenceType: 'topup',
      paymentMethod: 'upi', 
      status: 'success',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    // Add transaction to Wallet's transaction history array
    wallet.transactions.push(transaction._id);
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and wallet topped up successfully',
      balance: wallet.balance
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
