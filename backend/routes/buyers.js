const express = require('express');
const router = express.Router();
const Buyer = require('../models/Buyer');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');

// GET /api/buyers - Get all buyers
router.get('/', async (req, res, next) => {
  try {
    const buyersResult = await Buyer.find()
      .sort({ createdAt: -1 })
      .lean();
    
    const buyers = buyersResult.map(b => ({ id: b._id, ...b }));

    res.json({
      success: true,
      buyers
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/buyers/:id - Get buyer with bids and won auctions
router.get('/:id', async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) {
      return res.status(404).json({
        success: false,
        error: 'Buyer not found'
      });
    }

    const bidsResult = await Bid.find({ buyerId: buyer._id.toString() })
      .sort({ timestamp: -1 })
      .lean();
    
    const bids = bidsResult.map(b => ({ id: b._id, ...b }));

    // Get won auctions
    const wonAuctionsResult = await Auction.find({ buyerId: buyer._id.toString() })
      .sort({ createdAt: -1 })
      .lean();
    
    const wonAuctions = wonAuctionsResult.map(a => ({ id: a._id, ...a }));

    res.json({
      success: true,
      ...buyer.toObject(),
      id: buyer._id,
      bids,
      wonAuctions
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid buyer ID'
      });
    }
    next(error);
  }
});

// POST /api/buyers - Create new buyer (for registration)
router.post('/', async (req, res, next) => {
  try {
    const buyer = new Buyer(req.body);
    await buyer.save();

    // Create wallet for buyer
    const Wallet = require('../models/Wallet');
    const wallet = new Wallet({
      userId: buyer._id.toString(),
      userType: 'buyer',
      balance: 0,
      availableBalance: 0
    });
    await wallet.save();

    res.status(201).json({
      success: true,
      buyer,
      wallet: { balance: 0, availableBalance: 0 }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Buyer with this email already exists'
      });
    }
    next(error);
  }
});

// GET /api/buyers/stats - Get buyer statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await Buyer.aggregate([
      {
        $group: {
          _id: null,
          totalBuyers: { $sum: 1 },
          totalBids: { $sum: '$totalBids' },
          avgWalletBalance: { $avg: '$walletBalance' },
          topBuyer: { $max: '$walletBalance' }
        }
      }
    ]);

    const byType = await Buyer.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgWallet: { $avg: '$walletBalance' }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      summary: stats[0] || { totalBuyers: 0, totalBids: 0, avgWalletBalance: 0, topBuyer: 0 },
      byType
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
