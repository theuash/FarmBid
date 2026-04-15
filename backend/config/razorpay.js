const Razorpay = require('razorpay');

// Ensure Razorpay gets initialized correctly
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyIdHere',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourKeySecretHere',
});

module.exports = razorpay;
