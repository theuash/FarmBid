/**
 * FarmBid Database Seeder
 * Populates the MongoDB database with initial seed data
 * Run with: node backend/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Import models
const Farmer = require('./models/Farmer');
const Buyer = require('./models/Buyer');
const Admin = require('./models/Admin');
const Listing = require('./models/Listing');
const Bid = require('./models/Bid');
const Auction = require('./models/Auction');
const Dispute = require('./models/Dispute');
const Delivery = require('./models/Delivery');
const BlockchainEvent = require('./models/BlockchainEvent');
const Wallet = require('./models/Wallet');
const { anchorToBlockchain } = require('./utils/blockchain');

// Demo account emails from environment
const DEMO_BUYER_EMAIL = process.env.DEMO_BUYER_EMAIL || 'demo.buyer@farmbid.com';
const DEMO_FARMER_EMAIL = process.env.DEMO_FARMER_EMAIL || 'demo.farmer@farmbid.com';
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo.admin@farmbid.com';

// Seed data from original frontend
const seedFarmers = [
  {
    code: 'KA-KOL-001',
    name: 'Ramappa Gowda',
    email: DEMO_FARMER_EMAIL, // First farmer is the demo farmer
    phone: '+919876543210',
    village: 'Srinivaspur',
    district: 'Kolar',
    pincode: '563135',
    landSize: '2.5 acres',
    trustScore: 95,
    totalListings: 47,
    successfulSales: 45,
    joinedDate: '2024-08-15',
    aadhaarVerified: true,
    upiVerified: true,
    landVerified: true,
    language: 'Kannada',
    crops: ['Tomatoes', 'Chilies', 'Onions'],
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isDemo: true,
    role: 'farmer'
  },
  {
    code: 'KA-KOL-002',
    name: 'Lakshmi Devi',
    email: 'lakshmi.devi@example.com',
    phone: '+918765432109',
    village: 'Bangarpet',
    district: 'Kolar',
    pincode: '563114',
    landSize: '1.8 acres',
    trustScore: 88,
    totalListings: 23,
    successfulSales: 20,
    joinedDate: '2024-09-20',
    aadhaarVerified: true,
    upiVerified: true,
    landVerified: true,
    language: 'Kannada',
    crops: ['Tomatoes', 'Grapes'],
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    isDemo: true,
    role: 'farmer'
  },
  {
    code: 'KA-KOL-003',
    name: 'Venkatesh Naidu',
    email: 'venkatesh.naidu@example.com',
    phone: '+917654321098',
    village: 'Mulbagal',
    district: 'Kolar',
    pincode: '563131',
    landSize: '3.2 acres',
    trustScore: 72,
    totalListings: 12,
    successfulSales: 9,
    joinedDate: '2025-01-10',
    aadhaarVerified: true,
    upiVerified: true,
    landVerified: false,
    language: 'Telugu',
    crops: ['Potatoes', 'Onions'],
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    isDemo: true,
    role: 'farmer'
  },
  {
    code: 'KA-BLR-001',
    name: 'Manjunath Kumar',
    email: 'manjunath.kumar@example.com',
    phone: '+916543210987',
    village: 'Anekal',
    district: 'Bengaluru Rural',
    pincode: '562106',
    landSize: '4.0 acres',
    trustScore: 100,
    totalListings: 65,
    successfulSales: 64,
    joinedDate: '2024-06-01',
    aadhaarVerified: true,
    upiVerified: true,
    landVerified: true,
    language: 'Kannada',
    crops: ['Tomatoes', 'Chilies', 'Capsicum'],
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    isDemo: true,
    role: 'farmer'
  }
];

const seedBuyers = [
  {
    code: 'B001',
    name: 'Bengaluru Fresh Foods Pvt Ltd',
    email: DEMO_BUYER_EMAIL, // Use demo email
    phone: '+918023456789',
    type: 'Retailer',
    location: 'Bengaluru',
    walletBalance: 0,
    totalBids: 156,
    wonAuctions: 89,
    trustScore: 98,
    joinedDate: '2024-07-01',
    gstNumber: 'GSTIN001',
    panNumber: 'PAN001',
    isDemo: true,
    role: 'buyer'
  },
  {
    code: 'B002',
    name: 'Farm2Table Restaurant Chain',
    email: 'supply@farm2table.co',
    phone: '+918034567890',
    type: 'Restaurant',
    location: 'Bengaluru',
    walletBalance: 0,
    totalBids: 78,
    wonAuctions: 45,
    trustScore: 92,
    joinedDate: '2024-08-15',
    gstNumber: 'GSTIN002',
    panNumber: 'PAN002',
    isDemo: true,
    role: 'buyer'
  },
  {
    code: 'B003',
    name: 'Karnataka Vegetables Export',
    email: 'buy@kavegetables.com',
    phone: '+918045678901',
    type: 'Exporter',
    location: 'Bengaluru',
    walletBalance: 0,
    totalBids: 234,
    wonAuctions: 156,
    trustScore: 100,
    joinedDate: '2024-05-20',
    gstNumber: 'GSTIN003',
    panNumber: 'PAN003',
    isDemo: true,
    role: 'buyer'
  }
];

const seedListings = [
  {
    farmerId: null, // will be set after farmer seeding
    farmerCode: 'KA-KOL-001',
    farmerName: 'Ramappa Gowda',
    farmerTrustScore: 95,
    produce: 'Tomatoes',
    produceIcon: '🍅',
    quantity: 500,
    unit: 'kg',
    minPricePerKg: 32,
    currentBidPerKg: 38,
    totalBids: 7,
    harvestDate: '2025-06-28',
    expiryDate: '2025-06-30',
    auctionEndsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    qualityIndex: 92,
    qualityGrade: 'Premium',
    freshness: 95,
    surfaceDamage: 8,
    colorUniformity: 90,
    status: 'live',
    location: 'Srinivaspur, Kolar',
    pincode: '563135',
    images: ['https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940']
  },
  {
    farmerId: null,
    farmerCode: 'KA-KOL-002',
    farmerName: 'Lakshmi Devi',
    farmerTrustScore: 88,
    produce: 'Grapes',
    produceIcon: '🍇',
    quantity: 200,
    unit: 'kg',
    minPricePerKg: 75,
    currentBidPerKg: 92,
    totalBids: 12,
    harvestDate: '2025-06-27',
    expiryDate: '2025-06-29',
    auctionEndsAt: new Date(Date.now() + 45 * 60 * 1000),
    qualityIndex: 88,
    qualityGrade: 'Premium',
    freshness: 92,
    surfaceDamage: 5,
    colorUniformity: 88,
    status: 'ending_soon',
    location: 'Bangarpet, Kolar',
    pincode: '563114',
    images: ['https://images.unsplash.com/photo-1586319985690-3ed8cdc362ec?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZhcm0lMjB2ZWdldGFibGVzfGVufDB8fHxncmVlbnwxNzc1MDQxMDI3fDA&ixlib=rb-4.1.0&q=85']
  },
  {
    farmerId: null,
    farmerCode: 'KA-BLR-001',
    farmerName: 'Manjunath Kumar',
    farmerTrustScore: 100,
    produce: 'Green Chilies',
    produceIcon: '🌶️',
    quantity: 150,
    unit: 'kg',
    minPricePerKg: 48,
    currentBidPerKg: 55,
    totalBids: 5,
    harvestDate: '2025-06-28',
    expiryDate: '2025-07-01',
    auctionEndsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
    qualityIndex: 96,
    qualityGrade: 'Premium',
    freshness: 98,
    surfaceDamage: 3,
    colorUniformity: 95,
    status: 'live',
    location: 'Anekal, Bengaluru Rural',
    pincode: '562106',
    images: ['https://images.pexels.com/photos/31404683/pexels-photo-31404683.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940']
  },
  {
    farmerId: null,
    farmerCode: 'KA-KOL-003',
    farmerName: 'Venkatesh Naidu',
    farmerTrustScore: 72,
    produce: 'Potatoes',
    produceIcon: '🥔',
    quantity: 800,
    unit: 'kg',
    minPricePerKg: 18,
    currentBidPerKg: 22,
    totalBids: 3,
    harvestDate: '2025-06-26',
    expiryDate: '2025-07-05',
    auctionEndsAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    qualityIndex: 78,
    qualityGrade: 'Standard',
    freshness: 82,
    surfaceDamage: 15,
    colorUniformity: 80,
    status: 'live',
    location: 'Mulbagal, Kolar',
    pincode: '563131',
    images: ['https://images.unsplash.com/photo-1527542293608-68743ba7d06e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxwcm9kdWNlJTIwbWFya2V0fGVufDB8fHxncmVlbnwxNzc1MDQxMDMyfDA&ixlib=rb-4.1.0&q=85']
  },
  {
    farmerId: null,
    farmerCode: 'KA-KOL-001',
    farmerName: 'Ramappa Gowda',
    farmerTrustScore: 95,
    produce: 'Onions',
    produceIcon: '🧅',
    quantity: 650,
    unit: 'kg',
    minPricePerKg: 24,
    currentBidPerKg: 28,
    totalBids: 4,
    harvestDate: '2025-06-27',
    expiryDate: '2025-07-10',
    auctionEndsAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    qualityIndex: 85,
    qualityGrade: 'Premium',
    freshness: 88,
    surfaceDamage: 10,
    colorUniformity: 86,
    status: 'live',
    location: 'Srinivaspur, Kolar',
    pincode: '563135',
    images: ['https://images.pexels.com/photos/5473228/pexels-photo-5473228.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940']
  }
];

const seedBids = [
  { listingIndex: 0, buyerCode: 'B001', buyerName: 'Bengaluru Fresh Foods', bidPerKg: 38 },
  { listingIndex: 0, buyerCode: 'B002', buyerName: 'Farm2Table', bidPerKg: 36 },
  { listingIndex: 0, buyerCode: 'B003', buyerName: 'KA Vegetables Export', bidPerKg: 35 },
  { listingIndex: 1, buyerCode: 'B003', buyerName: 'KA Vegetables Export', bidPerKg: 92 },
  { listingIndex: 1, buyerCode: 'B001', buyerName: 'Bengaluru Fresh Foods', bidPerKg: 88 },
  { listingIndex: 2, buyerCode: 'B002', buyerName: 'Farm2Table', bidPerKg: 55 }
];

const seedDeliveries = [
  {
    auctionId: null,
    farmerId: null,
    buyerId: 'B001',
    status: 'delivered',
    pickupWeight: 402,
    deliveredWeight: 400,
    weightDiscrepancy: 0.5,
    pickupPhoto: true,
    deliveryPhoto: true,
    deliveryAgent: 'Suresh Kumar',
    deliveryAgentPhone: '+91 99887 76655',
    pickupTime: new Date('2025-06-25T08:00:00Z'),
    deliveryTime: new Date('2025-06-25T12:30:00Z'),
    geotagPickup: { lat: 13.1507, lng: 78.2046 },
    geotagDelivery: { lat: 12.9716, lng: 77.5946 }
  }
];

const seedCompletedAuctions = [
  {
    listingId: 'past-l1',
    farmerId: null,
    farmerCode: 'KA-KOL-001',
    farmerName: 'Ramappa Gowda',
    buyerId: 'B001',
    buyerName: 'Bengaluru Fresh Foods Pvt Ltd',
    produce: 'Tomatoes',
    quantity: 400,
    finalPricePerKg: 42,
    totalValue: 16800,
    status: 'settled',
    deliveryStatus: 'delivered',
    settledAt: '2025-06-25T14:30:00Z',
    blockchainHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f'
  }
];

const seedDisputes = [
  {
    auctionId: null,
    buyerId: 'B002',
    buyerName: 'Farm2Table Restaurant Chain',
    farmerId: null,
    farmerCode: 'KA-BLR-001',
    produce: 'Green Chilies',
    reason: 'weight_mismatch',
    description: 'Received 92kg instead of listed 100kg. Difference of 8%.',
    evidence: ['photo_weighin.jpg', 'receipt.pdf'],
    status: 'pending_review',
    amount: 6200,
    proposedRefund: 496,
    trustPenalty: 12
  }
];

const seedBlockchainEvents = [
  {
    type: 'listing_created',
    entityId: 'l1',
    entityType: 'listing',
    description: 'New listing created - 500kg Tomatoes',
    txHash: '0x8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    blockNumber: 58234567,
    timestamp: new Date('2025-06-28T08:30:00Z'),
    farmer: 'KA-KOL-001',
    network: 'Polygon Mainnet'
  },
  {
    type: 'bid_placed',
    entityId: 'l1',
    entityType: 'listing',
    description: 'Bid placed - ₹38/kg by Bengaluru Fresh Foods',
    txHash: '0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    blockNumber: 58234590,
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    buyer: 'B001',
    network: 'Polygon Mainnet'
  },
  {
    type: 'quality_anchored',
    entityId: 'l1',
    entityType: 'listing',
    description: 'AI Quality Score anchored - Index: 92 (Premium)',
    txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    blockNumber: 58234568,
    timestamp: new Date('2025-06-28T08:31:00Z'),
    qualityIndex: 92,
    network: 'Polygon Mainnet'
  },
  {
    type: 'escrow_locked',
    entityId: 'c1',
    entityType: 'auction',
    description: 'Escrow locked - ₹16,800 for 400kg Tomatoes',
    txHash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
    blockNumber: 58234200,
    timestamp: new Date('2025-06-25T10:00:00Z'),
    amount: 16800,
    network: 'Polygon Mainnet'
  },
  {
    type: 'settlement_released',
    entityId: 'c1',
    entityType: 'auction',
    description: 'Payment released to farmer KA-KOL-001',
    txHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
    blockNumber: 58234500,
    timestamp: new Date('2025-06-25T14:30:00Z'),
    amount: 16464,
    network: 'Polygon Mainnet'
  }
];

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌾 Starting FarmBid Database Seeding...');
    console.log(`📊 MongoDB: ${process.env.MONGO_URL}`);

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      Farmer.deleteMany({}),
      Buyer.deleteMany({}),
      Listing.deleteMany({}),
      Bid.deleteMany({}),
      Auction.deleteMany({}),
      Dispute.deleteMany({}),
      Delivery.deleteMany({}),
      BlockchainEvent.deleteMany({}),
      Wallet.deleteMany({})
    ]);

    // Seed farmers
    console.log('👨‍🌾 Seeding farmers...');
    const farmers = [];
    for (const farmerData of seedFarmers) {
      const farmer = new Farmer(farmerData);
      await farmer.save();
      farmers.push(farmer);
      console.log(`  ✅ ${farmer.code}: ${farmer.name}`);
    }

    // Seed buyers with wallets
    console.log('🛒 Seeding buyers...');
    const buyers = [];
    for (const buyerData of seedBuyers) {
      const buyer = new Buyer({
        ...buyerData,
        code: buyerData.code
      });
      await buyer.save();

      // Create wallet for buyer
      const wallet = new Wallet({
        userId: buyer._id.toString(),
        userType: 'buyer',
        balance: 0,
        availableBalance: 0
      });
      await wallet.save();

      buyers.push(buyer);
      console.log(`  ✅ ${buyer.code}: ${buyer.name}`);
    }

    // Update listings with farmer ObjectIds
    const listingsData = seedListings.map(listing => {
      const farmer = farmers.find(f => f.code === listing.farmerCode);
      return {
        ...listing,
        farmerId: farmer ? farmer._id : null
      };
    });

    // Seed listings
    console.log('📋 Seeding listings...');
    const listings = [];
    for (const listingData of listingsData) {
      const listing = new Listing(listingData);
      await listing.save();
      listings.push(listing);
      console.log(`  ✅ ${listing.produce} - ${listing.quantity}kg`);
    }

    // Create listing-to-id map for bids
    const listingIdMap = {};
    listings.forEach((listing, index) => {
      listingIdMap[index] = listing._id;
    });

    // Create buyer code to id map
    const buyerIdMap = {};
    buyers.forEach(buyer => {
      buyerIdMap[buyer.code] = buyer._id.toString();
    });

    // Seed bids
    console.log('💰 Seeding bids...');
    for (const bidData of seedBids) {
      const listingId = listingIdMap[bidData.listingIndex];
      const buyerId = buyerIdMap[bidData.buyerCode];

      if (!listingId || !buyerId) continue;

      const bid = new Bid({
        listingId,
        buyerId,
        buyerName: bidData.buyerName,
        bidPerKg: bidData.bidPerKg,
        timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000)
      });
      await bid.save();
      console.log(`  ✅ ${bidData.buyerName}: ₹${bidData.bidPerKg}/kg`);
    }

    // Seed auctions
    console.log('🎯 Seeding completed auctions...');
    const auctions = [];
    for (const auctionData of seedCompletedAuctions) {
      const farmer = farmers.find(f => f.code === auctionData.farmerCode);
      const buyer = buyers.find(b => b.code === auctionData.buyerId);

      const auction = new Auction({
        ...auctionData,
        farmerId: farmer ? farmer._id : null,
        buyerId: buyer ? buyer._id.toString() : null,
        listingId: listings[0]._id
      });
      await auction.save();
      auctions.push(auction);
      console.log(`  ✅ ${auctionData.produce}: ₹${auctionData.finalPricePerKg}/kg`);
    }

    // Seed deliveries
    console.log('🚚 Seeding deliveries...');
    for (const deliveryData of seedDeliveries) {
      const auction = auctions[0]; // link to first auction for demo

      const delivery = new Delivery({
        ...deliveryData,
        auctionId: auction ? auction._id : null,
        farmerId: auction ? auction.farmerId : null
      });
      await delivery.save();
      console.log(`  ✅ Delivery for auction ${delivery.auctionId}`);
    }

    // Seed disputes
    console.log('⚖️ Seeding disputes...');
    const farmer = farmers.find(f => f.code === 'KA-BLR-001'); // f4
    for (const disputeData of seedDisputes) {
      const auction = auctions.find(a => a.produce === disputeData.produce);

      const dispute = new Dispute({
        ...disputeData,
        auctionId: auction ? auction._id : auctions[0]._id,
        farmerId: farmer ? farmer._id : null
      });
      await dispute.save();
      console.log(`  ✅ ${dispute.reason}: ${dispute.amount}`);
    }

    // Seed blockchain events
    console.log('⛓️ Seeding blockchain events...');
    for (const eventData of seedBlockchainEvents) {
      const event = new BlockchainEvent(eventData);
      await event.save();
      console.log(`  ✅ ${eventData.type}`);
    }

    // Create demo users
    console.log('\n👤 Seeding demo accounts...');
    // Use email constants defined at top
    const DEMO_BUYER_PASSWORD = process.env.DEMO_BUYER_PASSWORD || 'demo123';
    const DEMO_FARMER_PASSWORD = process.env.DEMO_FARMER_PASSWORD || 'demo123';
    const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'demo123';

    // Hash demo passwords
    const salt = await bcrypt.genSalt(10);
    const hashedDemoBuyerPassword = await bcrypt.hash(DEMO_BUYER_PASSWORD, salt);
    const hashedDemoFarmerPassword = await bcrypt.hash(DEMO_FARMER_PASSWORD, salt);
    const hashedDemoAdminPassword = await bcrypt.hash(DEMO_ADMIN_PASSWORD, salt);

    // Create/update demo buyer (Bengaluru Fresh Foods)
    await Buyer.findOneAndUpdate(
      { email: DEMO_BUYER_EMAIL.toLowerCase() },
      {
        $set: {
          password: hashedDemoBuyerPassword,
          isDemo: true,
          role: 'buyer',
          walletBalance: 0,
          code: 'B001',
          name: 'Bengaluru Fresh Foods Pvt Ltd',
          phone: '+919876543210',
          type: 'Retailer',
          location: 'Bengaluru',
          totalBids: 156,
          wonAuctions: 89,
          trustScore: 98,
          joinedDate: '2024-07-01',
          gstNumber: 'GSTIN001',
          panNumber: 'PAN001'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✅ Demo Buyer: ${DEMO_BUYER_EMAIL} (isDemo: true)`);

    // Create/update demo farmer (Ramappa Gowda)
    await Farmer.findOneAndUpdate(
      { email: DEMO_FARMER_EMAIL.toLowerCase() },
      {
        $set: {
          code: 'KA-KOL-001',
          name: 'Ramappa Gowda',
          password: hashedDemoFarmerPassword,
          phone: '+919876543210',
          village: 'Srinivaspur',
          district: 'Kolar',
          pincode: '563135',
          landSize: '2.5 acres',
          trustScore: 95,
          totalListings: 47,
          successfulSales: 45,
          joinedDate: '2024-08-15',
          aadhaarVerified: true,
          upiVerified: true,
          landVerified: true,
          language: 'Kannada',
          crops: ['Tomatoes', 'Chilies', 'Onions'],
          profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          isDemo: true,
          role: 'farmer'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✅ Demo Farmer: ${DEMO_FARMER_EMAIL} (isDemo: true)`);

    // Create/update demo admin
    try {
      await Admin.findOneAndUpdate(
        { email: DEMO_ADMIN_EMAIL.toLowerCase() },
        {
          $set: {
            code: 'ADMIN001',
            name: 'FarmBid Administrator',
            password: hashedDemoAdminPassword,
            phone: '+91 98765 00000',
            role: 'admin',
            permissions: ['read', 'write', 'manage_users', 'manage_disputes'],
            isDemo: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✅ Demo Admin: ${DEMO_ADMIN_EMAIL} (isDemo: true)`);
    } catch (e) {
      // If Admin model doesn't exist or there's an error, that's okay
      console.log(`  ⚠️  Demo Admin could not be created (Admin model may need to be added): ${e.message}`);
    }

    // Also update wallets for demo users
    console.log('\n💳 Seeding demo wallets...');
    const demoBuyerFromDB = await Buyer.findOne({ email: DEMO_BUYER_EMAIL });
    if (demoBuyerFromDB) {
      await Wallet.findOneAndUpdate(
        { userId: demoBuyerFromDB._id.toString(), userType: 'buyer' },
        {
          userId: demoBuyerFromDB._id.toString(),
          userType: 'buyer',
          balance: 0,
          availableBalance: 0
        },
        { upsert: true }
      );
      console.log(`  ✅ Demo Buyer wallet: ₹0`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Farmers: ${await Farmer.countDocuments()}`);
    console.log(`📊 Buyers: ${await Buyer.countDocuments()}`);
    console.log(`📊 Listings: ${await Listing.countDocuments()}`);
    console.log(`📊 Bids: ${await Bid.countDocuments()}`);
    console.log(`📊 Auctions: ${await Auction.countDocuments()}`);
    console.log(`📊 Deliveries: ${await Delivery.countDocuments()}`);
    console.log(`📊 Disputes: ${await Dispute.countDocuments()}`);
    console.log(`📊 Blockchain Events: ${await BlockchainEvent.countDocuments()}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Connect and seed
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/farmbid_db';
mongoose
  .connect(mongoURL)
  .then(() => seedDatabase())
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

