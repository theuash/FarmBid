require('dotenv').config();
const mongoose = require('mongoose');

// Use the same DB connection logic as server.js
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/farmbid_db';

const reset = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURL);
    
    // We don't need the full models, just enough to update the fields
    const Wallet = mongoose.connection.model('Wallet', new mongoose.Schema({
      balance: Number,
      availableBalance: Number,
      userId: String
    }));

    const Buyer = mongoose.connection.model('Buyer', new mongoose.Schema({
      walletBalance: Number,
      email: String
    }));

    console.log('Resetting all Wallets to 0...');
    const walletRes = await Wallet.updateMany({}, {
      $set: { balance: 0, availableBalance: 0 }
    });

    console.log('Resetting all Buyer profiles to 0...');
    const buyerRes = await Buyer.updateMany({}, {
      $set: { walletBalance: 0 }
    });

    console.log('Success!');
    console.log(`- Updated ${walletRes.modifiedCount} wallets.`);
    console.log(`- Updated ${buyerRes.modifiedCount} buyer profiles.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error during reset:', err);
    process.exit(1);
  }
};

reset();
