const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { anchorToBlockchain, createBlockchainEvent } = require('../utils/blockchain');
const { v4: uuidv4 } = require('uuid');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// GET /api/wallet/balance - Get wallet balance for user
router.get('/balance', async (req, res, next) => {
  try {
    const { buyerId = 'b1' } = req.query;

    // Find or create wallet (backward compatibility)
    let wallet = await Wallet.findOne({ userId: buyerId, userType: 'buyer' });
    if (!wallet) {
      wallet = new Wallet({
        userId: buyerId,
        userType: 'buyer',
        balance: 0,
        availableBalance: 0
      });
      await wallet.save();
    }

    res.json({
      success: true,
      balance: wallet.balance,
      locked: wallet.lockedAmount,
      available: wallet.availableBalance
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallet/topup - Top up wallet balance
router.post('/topup', authenticateJWT, authorizeRole('buyer'), async (req, res, next) => {
  try {
    // Use authenticated user's ID
    const authUserId = req.user.userId;
    const { userId, userType = 'buyer', amount, paymentMethod = 'upi', referenceId } = req.body;

    // Verify that if userId is provided, it matches the authenticated user
    if (userId && userId !== authUserId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot top up another user\'s wallet'
      });
    }

    // Check if this referenceId has already been processed
    if (referenceId) {
      const existingTx = await WalletTransaction.findOne({ referenceId, status: 'completed' });
      if (existingTx) {
        return res.status(400).json({
          success: false,
          error: 'This transaction has already been processed'
        });
      }
    }

    // Use the authenticated user's ID
    const finalUserId = authUserId;

    const parsedAmount = Number(amount);
    
    if (isNaN(parsedAmount) || parsedAmount < 2) {
      return res.status(400).json({
        success: false,
        error: 'Minimum topup amount is 2'
      });
    }

    // Find wallet
    let wallet = await Wallet.findOne({ userId: finalUserId, userType });
    if (!wallet) {
      wallet = new Wallet({
        userId: finalUserId,
        userType,
        balance: 0,
        availableBalance: 0,
        lockedAmount: 0
      });
    }

    const balanceBefore = wallet.balance;
    // Add the topup to the existing balance cumulatively
    wallet.balance += parsedAmount;
    wallet.availableBalance += parsedAmount;

    await wallet.save();

    // Create transaction record
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      userId: finalUserId,
      type: 'topup',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Wallet topup via ${paymentMethod}`,
      referenceId: referenceId || uuidv4(),
      referenceType: 'topup',
      paymentMethod,
      status: 'completed'
    });

    await transaction.save();

    // Anchor topup to blockchain
    try {
      await anchorToBlockchain({
        type: 'wallet_topup',
        userId: finalUserId,
        amount: parsedAmount,
        referenceId: transaction.referenceId
      }, 'wallet_topup');
    } catch (err) {
      console.warn('Blockchain anchoring failed:', err.message);
    }

    res.json({
      success: true,
      newBalance: wallet.balance,
      transactionId: transaction._id,
      referenceId: transaction.referenceId,
      message: 'Wallet topped up successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/wallet/transactions/:userId - Get transaction history
router.get('/transactions/:userId', async (req, res, next) => {
  try {
    const { limit = 50, type } = req.query;
    const query = { userId: req.params.userId };

    if (type) {
      query.type = type;
    }

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get wallet balance
    const wallet = await Wallet.findOne({ userId: req.params.userId });

    res.json({
      success: true,
      transactions: transactions.map(t => ({ id: t._id, ...t })),
      currentBalance: wallet ? wallet.balance : 0
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/wallet/:userId - Get full wallet info
router.get('/:userId', async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.params.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      wallet: {
        id: wallet._id,
        ...wallet.toObject(),
        recentTransactions: recentTransactions.map(t => ({ id: t._id, ...t }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
