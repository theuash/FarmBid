const mongoose = require('mongoose');
require('dotenv').config();

// Fix: use MONGO_URL or fallback to farmbid_db
const MONGO_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/farmbid_db';

// Import models properly
const Farmer = require('../models/Farmer');
const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');

async function cleanup() {
  try {
    console.log(`Connecting to: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Delete all Listings
    const deletedListings = await Listing.deleteMany({});
    console.log(`Deleted ${deletedListings.deletedCount} listings`);

    // 2. Clear Bid history
    const deletedBids = await Bid.deleteMany({});
    console.log(`Deleted ${deletedBids.deletedCount} bids`);

    // 3. Clear Auctions
    const deletedAuctions = await Auction.deleteMany({});
    console.log(`Deleted ${deletedAuctions.deletedCount} auctions`);

    // 4. Update the demo agent "Agent Ujwal" to have 0 stats
    const DEMO_FARMER_EMAIL = process.env.DEMO_FARMER_EMAIL || 'demo.farmer@farmbid.com';
    const result = await Farmer.updateOne(
      { email: DEMO_FARMER_EMAIL },
      { 
        $set: { 
          name: 'Agent Ujwal',
          totalListings: 0, 
          successfulSales: 0, 
          crops: []
        } 
      }
    );
    console.log(`Updated demo agent stats: ${result.matchedCount} matched, ${result.modifiedCount} modified`);

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanup();
