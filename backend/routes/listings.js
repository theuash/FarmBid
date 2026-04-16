const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Farmer = require('../models/Farmer');
const Bid = require('../models/Bid');
const { updateAuctionStatus } = require('../utils/auctionTimer');
const { anchorToBlockchain, createBlockchainEvent } = require('../utils/blockchain');
const { sendWhatsAppMessage, listingStore } = require('../utils/whatsapp');
const { v4: uuidv4 } = require('uuid');
const { listingValidation, handleValidationErrors } = require('../middleware/validation');

// GET /api/listings - Get all listings with optional filter
router.get('/', async (req, res, next) => {
  try {
    const { status = 'live' } = req.query;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Update auction timers before fetching
    await updateAuctionStatusForListings(Listing);

    const listings = await Listing.find(query)
      .populate('farmerId', 'code name trustScore')
      .sort({ auctionEndsAt: 1 })
      .lean();

    // Add time remaining to each listing
    const getPublicImageUrl = (req, imagePath) => {
      if (!imagePath) return imagePath;
      if (/^https?:\/\//i.test(imagePath) || /^data:/i.test(imagePath)) return imagePath;
      const normalizedPath = imagePath.replace(/\\/g, '/');
      const fileName = normalizedPath.includes('/') ? normalizedPath.split('/').pop() : normalizedPath;
      return `${req.protocol}://${req.get('host')}/uploads/listings/${fileName}`;
    };

    const dbListings = listings.map(listing => ({
      id: listing._id.toString(),
      ...listing,
      images: Array.isArray(listing.images)
        ? listing.images.map((img) => getPublicImageUrl(req, img))
        : [],
      ...updateAuctionStatus(listing.auctionEndsAt),
      farmerId: listing.farmerId?._id?.toString(),
      farmerCode: listing.farmerCode,
      farmerName: listing.farmerName,
      farmerTrustScore: listing.farmerId?.trustScore
    }));

    const inMemoryListings = listingStore && typeof listingStore.values === 'function' ? Array.from(listingStore.values()) : []
      .filter(listing => listing && listing.status)
      .filter(listing => {
        // Exclude memory listings if a DB listing already has the same listingId/farmer
        return !listings.some(dbListing => 
          (dbListing.listingId === listing.listingId) || 
          (dbListing.farmerPhone === listing.farmerPhone && Date.now() - new Date(listing.createdAt).getTime() < 86400000)
        );
      })
      .map(listing => {
        const status = listing.status === 'active' ? 'live' : listing.status;
        const images = Array.isArray(listing.images)
          ? listing.images.map((img) => getPublicImageUrl(req, img))
          : [];
        return {
          id: listing.id || listing.listingId,
          ...listing,
          status,
          images,
          produce: listing.produce || 'Farm Produce',
          location: listing.location || 'Unknown location',
          unit: listing.unit || 'kg',
          minPricePerKg: listing.minPricePerKg || listing.minPrice || 0,
          currentBidPerKg: listing.currentBidPerKg || listing.minPricePerKg || listing.minPrice || 0,
          totalBids: listing.totalBids || 0,
          auctionEndsAt: listing.auctionEndsAt,
          ...updateAuctionStatus(listing.auctionEndsAt)
        };
      });

    const combinedListings = [...dbListings, ...inMemoryListings];

    const filteredListings = status && status !== 'all'
      ? combinedListings.filter((listing) => listing.status === status)
      : combinedListings;

    res.json({
      success: true,
      listings: filteredListings,
      count: filteredListings.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/listings/farmer/:farmerId - Get listings for a specific farmer
router.get('/farmer/:farmerId', async (req, res, next) => {
  try {
    const listings = await Listing.find({ farmerId: req.params.farmerId })
      .sort({ createdAt: -1 })
      .lean();

    const dbListings = listings.map(listing => ({
      id: listing._id.toString(),
      ...listing,
      ...updateAuctionStatus(listing.auctionEndsAt)
    }));

    res.json({ success: true, listings: dbListings });
  } catch (error) {
    next(error);
  }
});

// GET /api/listings/:id - Get specific listing with bids
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('farmerId', 'code name trustScore village district');

    let listingResult = listing;
    let isInMemory = false;

    if (!listing) {
      const inMemoryListing = (listingStore && typeof listingStore.values === 'function') 
        ? Array.from(listingStore.values()).find(item => item.id === req.params.id || item.listingId === req.params.id)
        : null;
      if (inMemoryListing) {
        isInMemory = true;
        listingResult = inMemoryListing;
      }
    }

    if (!listingResult) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    const bids = isInMemory ? [] : await Bid.find({ listingId: listingResult._id })
      .sort({ bidPerKg: -1, timestamp: 1 })
      .lean();

    const getPublicImageUrl = (req, imagePath) => {
      if (!imagePath) return imagePath;
      if (/^https?:\/\//i.test(imagePath) || /^data:/i.test(imagePath)) return imagePath;
      const normalizedPath = imagePath.replace(/\\/g, '/');
      const fileName = normalizedPath.includes('/') ? normalizedPath.split('/').pop() : normalizedPath;
      return `${req.protocol}://${req.get('host')}/uploads/listings/${fileName}`;
    };

    const responseListing = isInMemory
      ? {
          id: listingResult.id || listingResult.listingId,
          ...listingResult,
          images: Array.isArray(listingResult.images)
            ? listingResult.images.map((img) => getPublicImageUrl(req, img))
            : [],
          status: listingResult.status === 'active' ? 'live' : listingResult.status,
          minPricePerKg: listingResult.minPricePerKg || listingResult.minPrice || 0,
          currentBidPerKg: listingResult.currentBidPerKg || listingResult.minPricePerKg || listingResult.minPrice || 0,
          ...updateAuctionStatus(listingResult.auctionEndsAt)
        }
      : {
          id: listing._id.toString(),
          ...listing.toObject(),
          images: Array.isArray(listing.images)
            ? listing.images.map((img) => getPublicImageUrl(req, img))
            : [],
          ...updateAuctionStatus(listing.auctionEndsAt)
        };

    res.json({
      success: true,
      listing: responseListing,
      bids,
      blockchainEvents: []
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid listing ID'
      });
    }
    next(error);
  }
});

// POST /api/listings - Create new listing
router.post('/', handleValidationErrors, listingValidation, async (req, res, next) => {
  try {
    const {
      farmerId,
      produce,
      quantity,
      minPricePerKg,
      unit,
      harvestDate,
      expiryDate,
      location,
      pincode,
      qualityIndex,
      freshness,
      surfaceDamage,
      colorUniformity
    } = req.body;

    // Verify farmer exists
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(400).json({
        success: false,
        error: 'Farmer not found'
      });
    }

    // Determine quality grade
    let qualityGrade = 'Standard';
    if (qualityIndex >= 90) qualityGrade = 'Premium';
    else if (qualityIndex < 65) qualityGrade = 'At Risk';

    // Calculate auction end time (24 hours from now)
    const auctionEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create listing
    const listing = new Listing({
      farmerId: farmer._id,
      farmerCode: farmer.code,
      farmerName: farmer.name,
      farmerTrustScore: farmer.trustScore,
      produce,
      quantity,
      minPricePerKg,
      currentBidPerKg: minPricePerKg,
      unit: unit || 'kg',
      harvestDate,
      expiryDate,
      auctionEndsAt,
      qualityIndex: qualityIndex || 85,
      freshness: freshness || 85,
      colorUniformity: colorUniformity || 85,
      qualityGrade,
      status: 'live',
      location,
      pincode,
      source: req.body.source || 'web_farmer',
      agentId: req.body.agentId || null
    });

    await listing.save();

    // Anchor listing to blockchain
    const blockchainData = await anchorToBlockchain({
      type: 'listing_created',
      listingId: listing._id,
      produce,
      quantity,
      minPrice: minPricePerKg
    }, 'listing_created');

    // Create blockchain event record
    await createBlockchainEvent(require('../models/BlockchainEvent'), {
      type: 'listing_created',
      entityId: listing._id.toString(),
      entityType: 'listing',
      description: `New listing created - ${quantity}kg ${produce}`,
      txHash: blockchainData.txHash,
      blockNumber: blockchainData.blockNumber,
      timestamp: blockchainData.timestamp,
      farmer: farmer.code,
      network: blockchainData.network
    });

    try {
      await sendWhatsAppMessage({
        to: farmer.phone,
        body: `Hello ${farmer.name}, your listing for ${quantity} ${unit} of ${produce} is now live at ₹${minPricePerKg}/kg. Auction ends at ${auctionEndsAt.toISOString()}.`
      });
    } catch (notificationError) {
      console.warn('WhatsApp notification failed for listing creation:', notificationError.message || notificationError);
    }

    res.status(201).json({
      success: true,
      listing,
      blockchainHash: blockchainData.txHash,
      message: 'Listing created and anchored to blockchain'
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to update auction status for listings
async function updateAuctionStatusForListings(ListingModel) {
  try {
    const now = new Date();

    // 1. Set to 'won' if time is up and there are bids
    await ListingModel.updateMany(
      { 
        auctionEndsAt: { $lte: now }, 
        status: { $nin: ['ended', 'won', 'settled'] },
        totalBids: { $gt: 0 }
      },
      { $set: { status: 'won' } }
    );

    // 2. Set to 'ended' if time is up and there are NO bids
    await ListingModel.updateMany(
      { 
        auctionEndsAt: { $lte: now }, 
        status: { $nin: ['ended', 'won', 'settled'] },
        totalBids: 0
      },
      { $set: { status: 'ended' } }
    );

    // Update ending soon (1 hour threshold)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    await ListingModel.updateMany(
      {
        auctionEndsAt: { $gt: now, $lte: oneHourFromNow },
        status: { $ne: 'ending_soon' }
      },
      { $set: { status: 'ending_soon' } }
    );

    // Update live
    await ListingModel.updateMany(
      {
        auctionEndsAt: { $gt: oneHourFromNow },
        status: { $in: ['ending_soon', 'ended'] }
      },
      { $set: { status: 'live' } }
    );
  } catch (error) {
    console.error('Error updating listing statuses:', error);
  }
}

module.exports = router;
