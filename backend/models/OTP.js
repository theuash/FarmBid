const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  expiryTime: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete after expiry
  },
  purpose: {
    type: String,
    enum: ['signup', 'login', 'password_reset', 'phone_verification'],
    default: 'login'
  },
  userType: {
    type: String,
    enum: ['buyer', 'farmer', 'admin'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for cleaning up old records
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 }); // 10 minutes

// Update timestamp on save
otpSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('OTP', otpSchema);
