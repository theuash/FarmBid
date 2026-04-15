const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  userType: {
    type: String,
    enum: ['buyer', 'farmer'],
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  lockedAmount: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction'
  }],
  walletAddress: {
    type: String
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Wallet', walletSchema);
