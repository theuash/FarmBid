const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
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
    lowercase: true,
    unique: true,
    sparse: true // Allow null/missing values while keeping uniqueness for others
  },
  password: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  village: {
    type: String,
    default: 'Not specified'
  },
  district: {
    type: String,
    default: 'Not specified'
  },
  pincode: {
    type: String,
    default: '000000'
  },
  landSize: {
    type: String,
    default: 'Unverified'
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  totalListings: {
    type: Number,
    default: 0
  },
  successfulSales: {
    type: Number,
    default: 0
  },
  joinedDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  aadhaarVerified: {
    type: Boolean,
    default: false
  },
  upiVerified: {
    type: Boolean,
    default: false
  },
  landVerified: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    enum: ['Kannada', 'Hindi', 'Telugu', 'English', 'Tamil', 'Malayalam'],
    default: 'Kannada'
  },
  crops: [{
    type: String
  }],
  profileImage: {
    type: String,
    default: ''
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['buyer', 'farmer', 'admin', 'agent'],
    default: 'farmer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Farmer', farmerSchema);

