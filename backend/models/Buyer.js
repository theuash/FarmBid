const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.isDemo; // Password required for non-demo users
    }
  },
  phone: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Restaurant', 'Exporter', 'Wholesaler', 'Retailer', 'Individual'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  totalBids: {
    type: Number,
    default: 0
  },
  wonAuctions: {
    type: Number,
    default: 0
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  joinedDate: {
    type: String,
    required: true
  },
  gstNumber: {
    type: String
  },
  panNumber: {
    type: String
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['buyer', 'farmer', 'admin'],
    default: 'buyer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Buyer', buyerSchema);
