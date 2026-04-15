const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  type: {
    type: String,
    enum: ['topup', 'bid_escrow', 'release_to_farmer', 'refund', 'fee_charge', 'settlement', 'credit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  referenceId: {
    type: String
  },
  referenceType: {
    type: String,
    enum: ['bid', 'auction', 'dispute', 'topup', 'withdrawal'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'wallet', 'crypto'],
    default: 'upi'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'success'],
    default: 'success'
  }
}, {
  timestamps: true
});

// Index for transaction history queries
walletTransactionSchema.index({ userId: -1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
