const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
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
  produce: {
    type: String,
    required: true
  },
  produceIcon: {
    type: String,
    default: '🌾'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: ['kg', 'quintal', 'ton'],
    default: 'kg'
  },
  minPricePerKg: {
    type: Number,
    required: true,
    min: 0
  },
  currentBidPerKg: {
    type: Number,
    required: true
  },
  totalBids: {
    type: Number,
    default: 0
  },
  highestBidderId: {
    type: String
  },
  highestBidderName: {
    type: String
  },
  harvestDate: {
    type: String,
    required: true
  },
  expiryDate: {
    type: String,
    required: true
  },
  auctionEndsAt: {
    type: Date,
    required: true
  },
  qualityIndex: {
    type: Number,
    min: 0,
    max: 100
  },
  qualityGrade: {
    type: String,
    enum: ['Premium', 'Standard', 'At Risk', 'Rejected'],
    default: 'Standard'
  },
  freshness: {
    type: Number,
    min: 0,
    max: 100
  },
  surfaceDamage: {
    type: Number,
    min: 0,
    max: 100
  },
  colorUniformity: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['live', 'ended', 'ending_soon', 'cancelled', 'won', 'settled'],
    default: 'live'
  },
  location: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  blockchainHash: {
    type: String,
    default: () => '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
  },
  source: {
    type: String,
    enum: ['whatsapp', 'web_farmer', 'web_agent'],
    default: 'web_farmer'
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer' // Agents share the Farmer model for simplicity
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for auction status queries
listingSchema.index({ status: 1, auctionEndsAt: 1 });

module.exports = mongoose.model('Listing', listingSchema);
