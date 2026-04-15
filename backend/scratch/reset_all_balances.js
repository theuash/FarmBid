const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Wallet = require('../models/Wallet');

async function resetBalances() {
  try {
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
        throw new Error('MONGO_URL not found in environment');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    console.log('Resetting all wallet balances to 0...');
    const result = await Wallet.updateMany({}, {
      balance: 0,
      availableBalance: 0,
      lockedAmount: 0
    });

    console.log(`Successfully reset ${result.modifiedCount} wallets.`);
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (error) {
    console.error('Error resetting balances:', error);
    process.exit(1);
  }
}

resetBalances();
