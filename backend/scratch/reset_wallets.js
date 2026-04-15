const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/farmbid_db';

async function resetWallets() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
    
    // We update the collection directly or import the model
    const Wallet = require('../models/Wallet');
    const result = await Wallet.updateMany(
      { userType: 'buyer' }, 
      { $set: { balance: 0, availableBalance: 0 } }
    );
    
    console.log(`Successfully reset ${result.modifiedCount} buyer wallets to 0.`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting wallets:', err);
    process.exit(1);
  }
}

resetWallets();
