const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  language: {
    type: String,
    enum: ['en', 'kn'],
    default: 'en'
  },
  role: {
    type: String,
    enum: ['buyer', 'farmer', 'unknown'],
    default: 'unknown'
  },
  state: {
    type: String,
    default: 'START'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  tempData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // To track which flow we are in (e.g., 'REGISTERING_FARMER', 'CREATING_LISTING')
  currentFlow: {
    type: String,
    default: 'NONE'
  }
}, {
  timestamps: true
});

// Auto-expire sessions after 24 hours of inactivity
chatSessionSchema.index({ lastMessageAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
