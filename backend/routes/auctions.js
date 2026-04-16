const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Delivery = require('../models/Delivery');
const Bid = require('../models/Bid');
const Listing = require('../models/Listing');
const { anchorToBlockchain, createBlockchainEvent } = require('../utils/blockchain');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

// GET /api/auctions/completed - Get completed/finished auctions
router.get('/completed', async (req, res, next) => {
  try {
    const auctionsResult = await Auction.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    const auctions = auctionsResult.map(a => ({ id: a._id, ...a }));

    // Attach delivery information if exists
    const deliveryIds = auctions.map(a => a._id);
    const deliveries = await Delivery.find({ auctionId: { $in: deliveryIds } }).lean();
    const deliveryMap = {};
    deliveries.forEach(d => { deliveryMap[d.auctionId.toString()] = d; });

    const auctionsWithDelivery = auctions.map(auction => ({
      ...auction,
      delivery: deliveryMap[auction._id.toString()] || null
    }));

    res.json({
      success: true,
      auctions: auctionsWithDelivery
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auctions/:id - Get auction details
router.get('/:id', async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    const delivery = await Delivery.findOne({ auctionId: auction._id });

    res.json({
      success: true,
      auction: {
        id: auction._id,
        ...auction.toObject(),
        delivery: delivery ? { id: delivery._id, ...delivery.toObject() } : null
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid auction ID'
      });
    }
    next(error);
  }
});

// Create auction from listing (when auction ends with winning bid)
const createAuctionFromListing = async (listing, winningBid, auctionData = {}) => {
  try {
    const Auction = require('../models/Auction');
    const Farmer = require('../models/Farmer');

    const farmer = await Farmer.findById(listing.farmerId);

    const auction = new Auction({
      listingId: listing._id,
      farmerId: listing.farmerId,
      farmerCode: listing.farmerCode,
      farmerName: listing.farmerName,
      buyerId: winningBid.buyerId,
      buyerName: winningBid.buyerName,
      produce: listing.produce,
      quantity: listing.quantity,
      finalPricePerKg: winningBid.bidPerKg,
      totalValue: listing.quantity * winningBid.bidPerKg,
      status: 'pending_settlement',
      deliveryStatus: 'scheduled'
    });

    await auction.save();
    
    // Auto-deduct from buyer's wallet
    try {
      const Wallet = require('../models/Wallet');
      const WalletTransaction = require('../models/WalletTransaction');
      const { v4: uuidv4 } = require('uuid');
      
      const wallet = await Wallet.findOne({ userId: winningBid.buyerId });
      if (wallet) {
        const balanceBefore = wallet.balance;
        // The money was already removed from availableBalance and added to lockedAmount during the bid phase.
        // Now we finalize the deduction by removing it from the total balance and the locked pool.
        wallet.balance -= auction.totalValue;
        wallet.lockedAmount = Math.max(0, wallet.lockedAmount - auction.totalValue);
        await wallet.save();
        
        await WalletTransaction.create({
          walletId: wallet._id,
          userId: winningBid.buyerId,
          type: 'payment',
          amount: auction.totalValue,
          balanceBefore,
          balanceAfter: wallet.balance,
          description: `Auction payment realized for ${listing.produce} (Lot: ${auction._id})`,
          referenceId: auction._id,
          referenceType: 'auction',
          status: 'success'
        });
        console.log(`[Wallet] Auto-deducted ₹${auction.totalValue} from buyer ${winningBid.buyerId} for won auction.`);
      }
    } catch (walletErr) {
      console.error('Failed to auto-deduct funds from winner wallet:', walletErr);
      // We continue since the auction record is already saved, but this is a ledger inconsistency.
    }

    // Create blockchain event for auction settlement
    await anchorToBlockchain({
      type: 'auction_settled',
      listingId: listing._id,
      buyerId: winningBid.buyerId,
      amount: auction.totalValue
    }, 'auction_settled');

    return auction;
  } catch (error) {
    console.error('Error creating auction:', error);
    throw error;
  }
};

module.exports = { router, createAuctionFromListing };
