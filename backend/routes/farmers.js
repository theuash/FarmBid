const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Listing = require('../models/Listing');

// GET /api/farmers - Get all farmers
router.get('/', async (req, res, next) => {
  try {
    const farmersResult = await Farmer.find()
      .sort({ createdAt: -1 })
      .lean();
    
    const farmers = farmersResult.map(f => ({ id: f._id, ...f }));

    res.json({
      success: true,
      farmers
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/farmers/:id - Get farmer with listings
router.get('/:id', async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found'
      });
    }

    const listingsResult = await Listing.find({ farmerId: farmer._id })
      .sort({ createdAt: -1 })
      .lean();
    
    const listings = listingsResult.map(l => ({ id: l._id, ...l }));

    res.json({
      success: true,
      ...farmer.toObject(),
      id: farmer._id,
      listings
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid farmer ID'
      });
    }
    next(error);
  }
});

// POST /api/farmers - Create new farmer (for registration)
router.post('/', async (req, res, next) => {
  try {
    const farmerData = {
      ...req.body,
      code: generateFarmerCode(req.body.district)
    };

    const farmer = new Farmer(farmerData);
    await farmer.save();

    res.status(201).json({
      success: true,
      farmer
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Farmer with this code or email already exists'
      });
    }
    next(error);
  }
});

// Helper to generate farmer code
function generateFarmerCode(district) {
  const districtCode = district.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 1000);
  return `${districtCode}-${String(random).padStart(3, '0')}`;
}

// GET /api/farmers/stats - Get farmer statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await Farmer.aggregate([
      {
        $group: {
          _id: null,
          totalFarmers: { $sum: 1 },
          totalListings: { $sum: '$totalListings' },
          verifiedFarmers: {
            $sum: {
              $cond: [
                { $and: ['$aadhaarVerified', '$upiVerified', '$landVerified'] },
                1, 0
              ]
            }
          }
        }
      }
    ]);

    const districtStats = await Farmer.aggregate([
      { $group: {
        _id: '$district',
        farmerCount: { $sum: 1 }
      }},
      { $sort: { farmerCount: -1 } }
    ]);

    res.json({
      success: true,
      summary: stats[0] || { totalFarmers: 0, totalListings: 0, verifiedFarmers: 0 },
      byDistrict: districtStats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
