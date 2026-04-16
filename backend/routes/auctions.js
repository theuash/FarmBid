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
      deliveryStatus: 'pending',
      initiatedFarmerName: listing.initiatedFarmerName || 'Independent Producer',
      initiatedFarmerPhone: listing.initiatedFarmerPhone,
      initiatedFarmerUPI: listing.initiatedFarmerUPI,
      escrowStatus: 'collected'
    });

    await auction.save();
    
    // Auto-deduct from buyer's wallet and ADD to Agent's collectedFunds
    try {
      const Wallet = require('../models/Wallet');
      const WalletTransaction = require('../models/WalletTransaction');
      
      const buyerWallet = await Wallet.findOne({ userId: winningBid.buyerId });
      if (buyerWallet) {
        const balanceBefore = buyerWallet.balance;
        buyerWallet.balance -= auction.totalValue;
        buyerWallet.lockedAmount = Math.max(0, buyerWallet.lockedAmount - auction.totalValue);
        await buyerWallet.save();
        
        await WalletTransaction.create({
          walletId: buyerWallet._id,
          userId: winningBid.buyerId,
          type: 'payment',
          amount: auction.totalValue,
          balanceBefore,
          balanceAfter: buyerWallet.balance,
          description: `Auction payment realized for ${listing.produce}`,
          referenceId: auction._id,
          referenceType: 'auction',
          status: 'success'
        });
      }

      // Add to Agent's (Farmer record) collectedFunds
      const agentWallet = await Wallet.findOne({ userId: String(listing.farmerId) });
      if (agentWallet) {
        agentWallet.collectedFunds = (agentWallet.collectedFunds || 0) + auction.totalValue;
        await agentWallet.save();
        
        await WalletTransaction.create({
          walletId: agentWallet._id,
          userId: String(listing.farmerId),
          type: 'credit',
          amount: auction.totalValue,
          balanceBefore: 0, // Not useful for collectedFunds
          balanceAfter: agentWallet.collectedFunds,
          description: `Funds collected from ${winningBid.buyerName} for ${listing.produce}`,
          referenceId: auction._id,
          referenceType: 'auction',
          status: 'success'
        });
      }
      
    } catch (walletErr) {
      console.error('Failed to process funds transfer:', walletErr);
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

/**
 * @route   POST /api/auctions/:id/payout
 * @desc    Pay the initiated farmer from the agent's collected funds
 * @access  Private (Agent only)
 */
router.post('/:id/payout', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ success: false, error: 'Auction not found' });
    
    // Check if already paid
    if (auction.escrowStatus === 'paid_to_farmer') {
      return res.status(400).json({ success: false, error: 'Farmer already paid for this order' });
    }

    const Wallet = require('../models/Wallet');
    const agentWallet = await Wallet.findOne({ userId: String(auction.farmerId) });
    
    if (!agentWallet || agentWallet.collectedFunds < auction.totalValue) {
      return res.status(400).json({ success: false, error: 'Insufficient collected funds in agent wallet' });
    }

    // Process Payout
    agentWallet.collectedFunds -= auction.totalValue;
    await agentWallet.save();

    auction.escrowStatus = 'paid_to_farmer';
    await auction.save();

    // Notify Farmer (Mock WhatsApp)
    try {
      const { sendWhatsAppMessage } = require('../utils/whatsapp');
      if (auction.initiatedFarmerPhone) {
        await sendWhatsAppMessage({
          to: auction.initiatedFarmerPhone,
          body: `💰 Payment Sent: ₹${auction.totalValue}\nRef: ${auction._id.toString().slice(-6)}\nProduce: ${auction.produce}\nFrom: ${auction.farmerName} (Agent)`
        });
      }
    } catch (e) {
      console.error('WhatsApp notification failed:', e.message);
    }

    res.json({ success: true, message: 'Payment to farmer recorded and deducted from collected funds' });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ success: false, error: 'Server error during payout' });
  }
});

module.exports = { router, createAuctionFromListing };
