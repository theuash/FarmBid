const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Listing = require('../models/Listing');
const Wallet = require('../models/Wallet');

// GET /api/stats/buyer/:id - Get real-time stats for a buyer
router.get('/buyer/:id', async (req, res, next) => {
  try {
    const buyerId = req.params.id;

    // 1. Wallet Balance
    const wallet = await Wallet.findOne({ userId: buyerId });
    const balance = wallet ? wallet.balance : 0;

    // 2. Active Bids (Unique listings where the buyer has bidded and listing is live)
    const myBids = await Bid.find({ buyerId }).distinct('listingId');
    const activeListingsCount = await Listing.countDocuments({
      _id: { $in: myBids },
      status: { $in: ['live', 'ending_soon'] }
    });

    // 3. Won Auctions
    const wonCount = await Auction.countDocuments({ buyerId });

    // 4. Total Saved (Estimate: compared to a 10% markup from floor price as "Market Rate")
    const wonAuctions = await Auction.find({ buyerId });
    let totalSaved = 0;
    
    for (const auction of wonAuctions) {
      // Find the associated listing to get minPrice
      const listing = await Listing.findById(auction.listingId);
      if (listing) {
        const marketPrice = listing.minPricePerKg * 1.15; // Assume market is 15% higher than farmer floor
        const savingsPerKg = Math.max(0, marketPrice - auction.finalPricePerKg);
        totalSaved += savingsPerKg * auction.quantity;
      }
    }

    res.json({
      success: true,
      stats: {
        walletBalance: balance,
        activeBids: activeListingsCount,
        wonAuctions: wonCount,
        totalSaved: Math.round(totalSaved)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
