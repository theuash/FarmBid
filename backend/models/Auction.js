const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  farmerCode: {
    type: String,
    required: true
  },
  farmerName: {
    type: String,
    required: true
  },
  buyerId: {
    type: String,
    required: true
  },
  buyerName: {
    type: String,
    required: true
  },
  produce: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  finalPricePerKg: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['settled', 'disputed', 'cancelled', 'pending_settlement'],
    default: 'settled'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  disputeReason: {
    type: String
  },
  settledAt: {
    type: Date
  },
  initiatedFarmerName: String,
  initiatedFarmerPhone: String,
  initiatedFarmerUPI: String,
  escrowStatus: {
    type: String,
    enum: ['pending', 'collected', 'paid_to_farmer'],
    default: 'pending'
  },
  blockchainHash: {
    type: String,
    default: () => '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
  },
  transactionId: {
    type: String
  },
  escrowReleased: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Auction', auctionSchema);
