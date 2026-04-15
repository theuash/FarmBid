const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Buyer = require('../models/Buyer');
const Farmer = require('../models/Farmer');
const { anchorToBlockchain, createBlockchainEvent } = require('../utils/blockchain');
const { sendWhatsAppMessage } = require('../utils/whatsapp.final');
const { v4: uuidv4 } = require('uuid');
const { bidValidation, handleValidationErrors } = require('../middleware/validation');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// POST /api/bids - Place a bid
router.post('/', authenticateJWT, authorizeRole('buyer'), handleValidationErrors, bidValidation, async (req, res, next) => {
  try {
    const { listingId, bidPerKg } = req.body;
    console.log(`[BidsRoute] Attempting bid placement for listing: ${listingId} by user: ${req.user?.userId} (Payload bid: ${bidPerKg})`);
    
    // Use authenticated user's ID; ignore any buyerId from body for security
    const buyerId = req.user.userId;

    // Verify that the authenticated user's ID matches the requested buyerId (if provided)
    if (req.body.buyerId && req.body.buyerId !== buyerId) {
      console.warn(`[BidsRoute] Forbidden: request buyerId (${req.body.buyerId}) mismatches decoded userId (${buyerId})`);
      return res.status(403).json({
        success: false,
        error: 'Cannot place bid for another user'
      });
    }

    // Try find in DB first, fallback to Memory Store for recent WhatsApp listings
    let listing = null;
    try {
      listing = await Listing.findById(listingId);
    } catch (e) {
      // Not a valid ObjectId or other DB error
    }

    if (!listing) {
      listing = Array.from(require('../utils/whatsapp.final').listingStore.values()).find(
        l => l.id === listingId || l.listingId === listingId
      );
      if (listing) {
        // Mock a save() function for in-memory listing to avoid crashes
        listing.save = async () => {
          require('../utils/whatsapp.final').listingStore.set(listing.listingId || listing.id, listing);
          return listing;
        };
        // Add required fields if missing for Bid relation
        listing._id = listing.id || listing.listingId; 
      }
    }

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    // Check if auction has ended
    if (listing.status === 'ended') {
      return res.status(400).json({
        success: false,
        error: 'Auction has ended'
      });
    }

    // Check if bid is higher than current
    if (Number(bidPerKg) <= Number(listing.currentBidPerKg || 0)) {
      console.warn(`[BidsRoute] Bid too low! Requested: ${bidPerKg}, Current: ${listing.currentBidPerKg}`);
      return res.status(400).json({
        success: false,
        error: `Bid must be higher than current bid of ₹${listing.currentBidPerKg}/kg`
      });
    }

    // Fetch buyer name if available
    let buyerName = buyerId; 
    try {
      const buyer = await Buyer.findById(buyerId);
      if (buyer) {
        buyerName = buyer.name;
      }
    } catch (err) {
      console.warn('Could not fetch buyer name for bid:', err.message);
    }

    // Create bid
    const bid = new Bid({
      listingId: listing._id,
      buyerId,
      buyerName,
      bidPerKg,
      timestamp: new Date()
    });

    await bid.save();

    // Update listing
    listing.currentBidPerKg = bidPerKg;
    listing.totalBids += 1;
    listing.highestBidderId = buyerId;
    listing.highestBidderName = buyerName;
    await listing.save();

    // Anchor bid to blockchain
    const blockchainData = await anchorToBlockchain({
      type: 'bid_placed',
      listingId: listing._id,
      buyerId,
      bidAmount: bidPerKg
    }, 'bid_placed');

    // Create blockchain event
    await createBlockchainEvent(require('../models/BlockchainEvent'), {
      type: 'bid_placed',
      entityId: listing._id.toString(),
      entityType: 'listing',
      description: `Bid placed - ₹${bidPerKg}/kg by buyer ${buyerId}`,
      txHash: blockchainData.txHash,
      blockNumber: blockchainData.blockNumber,
      timestamp: blockchainData.timestamp,
      buyer: buyerId,
      network: blockchainData.network
    });

    try {
      const buyer = await Buyer.findById(buyerId);
      const farmer = await Farmer.findById(listing.farmerId);
      const notifications = [];

      if (buyer && buyer.phone) {
        notifications.push(sendWhatsAppMessage({
          to: buyer.phone,
          body: `Hello ${buyer.name}, your bid of ₹${bidPerKg}/kg on ${listing.produce} is now the highest bid. Good luck!`
        }));
      }

      if (farmer && farmer.phone) {
        notifications.push(sendWhatsAppMessage({
          to: farmer.phone,
          body: `Hi ${farmer.name}, a new bid of ₹${bidPerKg}/kg has been placed on your ${listing.produce} listing. Current highest bid is ₹${bidPerKg}/kg.`
        }));
      }

      await Promise.allSettled(notifications);
    } catch (notificationError) {
      console.warn('WhatsApp notification failed for bid placement:', notificationError.message || notificationError);
    }

    console.log(`[BidsRoute] SUCCESS: Bid of ₹${bidPerKg} placed on listing ${listing._id}`);
    res.status(201).json({
      success: true,
      bid: {
        id: bid._id,
        ...bid.toObject()
      },
      blockchainEvent: {
        txHash: blockchainData.txHash,
        blockNumber: blockchainData.blockNumber,
        network: blockchainData.network,
        timestamp: blockchainData.timestamp
      },
      message: 'Bid placed successfully and anchored to blockchain'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bids - Get bids for a listing
router.get('/', async (req, res, next) => {
  try {
    const { listingId } = req.query;

    const query = listingId ? { listingId } : {};

    const bidsResult = await Bid.find(query)
      .sort({ bidPerKg: -1, timestamp: 1 })
      .lean();
    
    const bids = bidsResult.map(bid => ({
        id: bid._id,
        ...bid
      }));

    res.json({
      success: true,
      bids
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bids/:id - Get bid details
router.get('/:id', async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({
        success: false,
        error: 'Bid not found'
      });
    }

    res.json({
      success: true,
      bid: {
        id: bid._id,
        ...bid.toObject()
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid bid ID'
      });
    }
    next(error);
  }
});

// GET /api/bids/buyer/:buyerId - Get bids by buyer
router.get('/buyer/:buyerId', async (req, res, next) => {
  try {
    const bidsResult = await Bid.find({ buyerId: req.params.buyerId })
      .sort({ timestamp: -1 })
      .lean();
    
    const bids = bidsResult.map(bid => ({
        id: bid._id,
        ...bid
      }));

    res.json({
      success: true,
      bids
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
