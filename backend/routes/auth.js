const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '1029926669524-ofsccdtlbsjqo5sbvino6il9llq3ecuq.apps.googleusercontent.com';
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Debug: Check if env is loaded
console.log('[auth] JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES (length: ' + process.env.JWT_SECRET.length + ')' : 'NO');
console.log('[auth] GOOGLE_CLIENT_ID loaded:', GOOGLE_CLIENT_ID ? 'YES' : 'NO');
console.log('[auth] DEMO_BUYER_EMAIL:', process.env.DEMO_BUYER_EMAIL);
console.log('[auth] DEMO_FARMER_EMAIL:', process.env.DEMO_FARMER_EMAIL);

// Import models
const Buyer = require('../models/Buyer');
const Farmer = require('../models/Farmer');
const Admin = require('../models/Admin'); // We'll create this if it doesn't exist
const OTP = require('../models/OTP');
const otpService = require('../utils/otpService');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_random_string_change_this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with email and password
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().trim()
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Try to find user in Buyer collection
    let user = await Buyer.findOne({ email: email.toLowerCase() });
    let userType = 'buyer';

    if (!user) {
      // Try Farmer collection
      user = await Farmer.findOne({ email: email.toLowerCase() });
      userType = 'farmer';
    }

    if (!user) {
      // Try Admin collection (if exists)
      try {
        user = await Admin.findOne({ email: email.toLowerCase() });
        userType = 'admin';
      } catch (e) {
        // Admin model may not exist yet, ignore
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password (skip for demo users if they have flag, but still validate)
    if (!user.isDemo && user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
    } else if (!user.isDemo) {
      // Non-demo user should have password
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: userType,
        email: user.email,
        name: user.name,
        isDemo: user.isDemo || false,
        role: user.role || userType
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (exclude password)
    const userResponse = {
      id: user._id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || userType,
      isDemo: user.isDemo || false,
      walletBalance: user.walletBalance || 0,
      trustScore: user.trustScore || 80
    };

    // For farmers, add additional fields
    if (userType === 'farmer') {
      userResponse.village = user.village;
      userResponse.district = user.district;
      userResponse.landSize = user.landSize;
      userResponse.crops = user.crops;
    }

    res.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new buyer or farmer
 * @access  Public
 */
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name, role, userType, phone, ...extraData } = req.body;
    // Support both 'role' and 'userType' from frontend
    const userRole = role || userType;

    if (!userRole || !['buyer', 'farmer'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be buyer or farmer'
      });
    }

    // Check if user already exists
    let existingUser;
    if (userRole === 'buyer') {
      existingUser = await Buyer.findOne({ email: email.toLowerCase() });
    } else if (userRole === 'farmer') {
      existingUser = await Farmer.findOne({ email: email.toLowerCase() });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user based on role
    let user;
    if (userRole === 'buyer') {
      // Generate unique code for buyer
      const buyerCount = await Buyer.countDocuments();
      const code = `B${String(buyerCount + 1).padStart(3, '0')}`;

      // Set defaults for required fields not in form
      const buyerType = extraData.type || 'Individual'; // Default buyer type

      user = new Buyer({
        ...extraData,
        code,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        type: buyerType,
        location: extraData.location || 'Not specified',
        isDemo: false,
        role: 'buyer',
        joinedDate: new Date().toISOString().split('T')[0],
        walletBalance: 50000 // Default wallet for new buyers
      });
    } else if (userRole === 'farmer') {
      // Generate unique code for farmer
      const farmerCount = await Farmer.countDocuments();
      const districtCode = extraData.district ? extraData.district.substring(0, 2).toUpperCase() : 'XX';
      const code = `KA-${districtCode}-${String(farmerCount + 1).padStart(3, '0')}`;

      // Set defaults for required fields not in form
      user = new Farmer({
        ...extraData,
        code,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        village: extraData.village || 'Not specified',
        district: extraData.district || 'Not specified',
        pincode: extraData.pincode || '000000',
        landSize: extraData.landSize || '0 acres',
        isDemo: false,
        role: 'farmer',
        joinedDate: new Date().toISOString().split('T')[0],
        trustScore: 50, // Default trust score for new farmers
        crops: extraData.crops || [],
        aadhaarVerified: false,
        upiVerified: false,
        landVerified: false,
        language: 'Kannada',
        profileImage: ''
      });
    }

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: userRole,
        email: user.email,
        name: user.name,
        isDemo: false,
        role: userRole
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data
    const userResponse = {
      id: user._id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || userRole,
      isDemo: false,
      walletBalance: userRole === 'buyer' ? 50000 : 0,
      trustScore: userRole === 'farmer' ? (user.trustScore || 50) : 80
    };

    // For farmers, add additional fields
    if (userRole === 'farmer') {
      userResponse.village = user.village;
      userResponse.district = user.district;
      userResponse.landSize = user.landSize;
      userResponse.crops = user.crops || [];
    }

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/demo-login
 * @desc    Get pre-configured demo user token
 * @access  Public
 */
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['buyer', 'farmer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be buyer, farmer, or admin'
      });
    }

    let user, userType;

    if (role === 'buyer') {
      // Get or create demo buyer
      const DEMO_BUYER_EMAIL = process.env.DEMO_BUYER_EMAIL || 'demo.buyer@farmbid.com';
      const DEMO_BUYER_PASSWORD = process.env.DEMO_BUYER_PASSWORD || 'demo123';

      user = await Buyer.findOne({ email: DEMO_BUYER_EMAIL });

      if (!user) {
        // Create demo buyer with seed data
        const demoBuyerData = {
          code: 'B001',
          name: 'Bengaluru Fresh Foods Pvt Ltd',
          email: DEMO_BUYER_EMAIL,
          phone: '+91 80 2345 6789',
          type: 'Retailer',
          location: 'Bengaluru',
          walletBalance: 250000,
          totalBids: 156,
          wonAuctions: 89,
          trustScore: 98,
          joinedDate: '2024-07-01',
          gstNumber: 'GSTIN001',
          panNumber: 'PAN001',
          isDemo: true,
          role: 'buyer'
        };

        // Hash demo password
        const salt = await bcrypt.genSalt(10);
        demoBuyerData.password = await bcrypt.hash(DEMO_BUYER_PASSWORD, salt);

        user = new Buyer(demoBuyerData);
        await user.save();
      }

      userType = 'buyer';

    } else if (role === 'farmer') {
      // Get or create demo farmer
      const DEMO_FARMER_EMAIL = process.env.DEMO_FARMER_EMAIL || 'demo.farmer@farmbid.com';
      const DEMO_FARMER_PASSWORD = process.env.DEMO_FARMER_PASSWORD || 'demo123';

      user = await Farmer.findOne({ email: DEMO_FARMER_EMAIL });

      if (!user) {
        // Create demo farmer with seed data (first seed farmer)
        const demoFarmerData = {
          code: 'KA-KOL-001',
          name: 'Ramappa Gowda',
          email: DEMO_FARMER_EMAIL,
          phone: '+91 98765 43210',
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
        };

        // Hash demo password
        const salt = await bcrypt.genSalt(10);
        demoFarmerData.password = await bcrypt.hash(DEMO_FARMER_PASSWORD, salt);

        user = new Farmer(demoFarmerData);
        await user.save();
      }

      userType = 'farmer';

    } else if (role === 'admin') {
      // Get or create demo admin
      const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo.admin@farmbid.com';
      const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'demo123';

      // Try to find in Admin, Buyer, or Farmer
      try {
        user = await Admin.findOne({ email: DEMO_ADMIN_EMAIL });
      } catch (e) {
        // Admin model may not exist, try Farmer as fallback
        user = await Farmer.findOne({ email: DEMO_ADMIN_EMAIL });
        if (!user) {
          user = await Buyer.findOne({ email: DEMO_ADMIN_EMAIL });
        }
      }

      if (!user) {
        // Create demo admin - for simplicity, we'll create as a Buyer with admin role
        // In production, you'd want a proper Admin model
        const demoAdminData = {
          code: 'ADMIN001',
          name: 'FarmBid Administrator',
          email: DEMO_ADMIN_EMAIL,
          phone: '+91 98765 00000',
          location: 'Bengaluru',
          walletBalance: 0,
          trustScore: 100,
          joinedDate: '2024-01-01',
          isDemo: true,
          role: 'admin'
        };

        // Hash demo password
        const salt = await bcrypt.genSalt(10);
        demoAdminData.password = await bcrypt.hash(DEMO_ADMIN_PASSWORD, salt);

        // Try to create as Admin, fallback to Buyer
        try {
          user = new Admin(demoAdminData);
          await user.save();
          userType = 'admin';
        } catch (e) {
          // Admin model doesn't exist, create as Buyer with admin role
          user = new Buyer({
            ...demoAdminData,
            type: 'Individual',
            email: DEMO_ADMIN_EMAIL
          });
          await user.save();
          userType = 'buyer';
        }
      } else {
        userType = user.role || 'admin';
      }
    }

    // Generate JWT token
    console.log('[demo-login] User object:', { email: user.email, _id: user._id, _idType: typeof user._id, isDemo: user.isDemo, role: user.role });
    console.log('[demo-login] JWT_SECRET length:', process.env.JWT_SECRET?.length);
    console.log('[demo-login] JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);

    let token;
    try {
      const payload = {
        userId: user._id.toString(),
        userType: userType,
        email: user.email,
        name: user.name,
        isDemo: user.isDemo || true,
        role: user.role || userType
      };
      console.log('[demo-login] JWT payload:', payload);
      token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      console.log('[demo-login] JWT generated successfully, token preview:', token.substring(0, 50) + '...');
    } catch (jwtError) {
      console.error('[demo-login] JWT signing failed:', jwtError);
      // Fallback shouldn't happen - rethrow
      throw jwtError;
    }

    // Return user data
    const userResponse = {
      id: user._id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || userType,
      isDemo: user.isDemo || true,
      walletBalance: user.walletBalance || 0,
      trustScore: user.trustScore || 100
    };

    // For farmers, add additional fields
    if (userType === 'farmer') {
      userResponse.village = user.village;
      userResponse.district = user.district;
      userResponse.landSize = user.landSize;
      userResponse.crops = user.crops;
    }

    res.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token and return user info
 * @access  Public (but expects valid token)
 */
router.post('/verify-token', async (req, res) => {
  console.log('[verify-token] Headers:', req.headers.authorization);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Invalid token format'
    });
  }

  try {
    console.log('[verify-token] Verifying token with JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[verify-token] Decoded:', decoded);

    // Fetch fresh user data from database
    let user;
    if (decoded.userType === 'buyer') {
      user = await Buyer.findById(decoded.userId).select('-password');
    } else if (decoded.userType === 'farmer') {
      user = await Farmer.findById(decoded.userId).select('-password');
    } else if (decoded.userType === 'admin') {
      try {
        user = await Admin.findById(decoded.userId).select('-password');
      } catch (e) {
        // Admin may not exist, ignore
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id,
        code: user.code,
        name: user.name,
        email: user.email,
        role: user.role || decoded.userType,
        isDemo: user.isDemo || false,
        walletBalance: user.walletBalance || 0,
        trustScore: user.trustScore || 80,
        profileImage: user.profileImage || null
      }
    });

  } catch (error) {
    console.error('[verify-token] Verification error:', error.name, error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Token expired'
      });
    }

    return res.status(403).json({
      success: false,
      authenticated: false,
      error: 'Invalid token',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (for completeness - JWT is stateless)
 * In a production app, you'd implement token blacklisting or refresh tokens
 */
router.post('/logout', (req, res) => {
  // For now, just return success - client should remove token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   POST /api/auth/google-login
 * @desc    Authenticate or register user with Google Single Sign-on
 * @access  Public
 */
router.post('/google-login', async (req, res) => {
  try {
    const { token, role } = req.body; // default to buyer
    const userRole = role || 'buyer';

    if (!token) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const isJwtToken = typeof token === 'string' && token.split('.').length === 3;
    let payload;
    let googleId;

    if (isJwtToken) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
      googleId = payload?.sub;
    } else {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!userInfoRes.ok) {
        return res.status(401).json({ success: false, error: 'Invalid Google access token' });
      }

      payload = await userInfoRes.json();
      googleId = payload?.sub;
    }

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Google account missing email' });
    }

    // Check if user exists across all models mapped to this email
    let user = await Buyer.findOne({ email });
    let userType = 'buyer';

    if (!user) {
      user = await Farmer.findOne({ email });
      if (user) {
        userType = 'farmer';
      }
    }

    if (!user) {
       // Create a new user since they don't exist
       userType = ['farmer'].includes(userRole.toLowerCase()) ? 'farmer' : 'buyer';
       
       if (userType === 'buyer') {
         const buyerCount = await Buyer.countDocuments();
         user = new Buyer({
            code: `B${String(buyerCount + 1).padStart(3, '0')}`,
            name,
            email,
            phone: `G-${googleId}`,
            password: crypto.randomBytes(16).toString('hex'),
            profileImage: picture,
            type: 'Individual',
            location: 'Not specified',
            role: 'buyer',
            joinedDate: new Date().toISOString().split('T')[0],
            walletBalance: 50000, // Seed money
            trustScore: 80,
            isDemo: false
         });
       } else {
         const farmerCount = await Farmer.countDocuments();
         user = new Farmer({
            code: `KA-XX-${String(farmerCount + 1).padStart(3, '0')}`,
            name,
            email,
            phone: `G-${googleId}`,
            password: crypto.randomBytes(16).toString('hex'),
            profileImage: picture,
            village: 'Unknown',
            district: 'Unknown',
            pincode: '000000',
            landSize: '0 acres',
            role: 'farmer',
            joinedDate: new Date().toISOString().split('T')[0],
            trustScore: 50,
            crops: [],
            isDemo: false
         });
       }
       await user.save();
    } else {
      // Update missing Google Info if they just logged in differently
      if (!user.profileImage && picture) {
        user.profileImage = picture;
        await user.save();
      }
    }

    // Generate our JWT token using our standard secret
    const jwtToken = jwt.sign(
      {
        userId: user._id.toString(),
        userType: userType,
        email: user.email,
        name: user.name,
        isDemo: user.isDemo || false,
        role: user.role || userType
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Form user response
    const userResponse = {
      id: user._id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || userType,
      isDemo: user.isDemo || false,
      walletBalance: user.walletBalance || 0,
      trustScore: user.trustScore || 80,
      profileImage: user.profileImage || null
    };

    if (userType === 'farmer') {
      userResponse.village = user.village;
      userResponse.district = user.district;
      userResponse.landSize = user.landSize;
      userResponse.crops = user.crops || [];
    }

    res.json({
      success: true,
      token: jwtToken,
      user: userResponse
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, error: 'Google Authentication failed', details: error.message });
  }
});

// ============= OTP AUTHENTICATION ROUTES =============

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number (for signup or login)
 * @access  Public
 */
router.post('/send-otp', [
  body('phone').notEmpty().trim(),
  body('userType').isIn(['buyer', 'farmer']),
  body('purpose').isIn(['signup', 'login', 'password_reset'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { phone, userType, purpose, email } = req.body;

    // Validate phone format
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number'
      });
    }

    // For signup, check if user already exists
    if (purpose === 'signup') {
      const existingUser = userType === 'buyer' 
        ? await Buyer.findOne({ phone })
        : await Farmer.findOne({ phone });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Phone number already registered'
        });
      }
    }

    // Generate and send OTP
    const result = await otpService.generateAndSendOTP(phone);

    if (result.success) {
      // Store in database
      const normalizedPhone = phone.replace(/\D/g, '');
      await OTP.findOneAndUpdate(
        { phoneNumber: normalizedPhone },
        {
          phoneNumber: normalizedPhone,
          email,
          otp: otpService.generateOTP(),
          purpose,
          userType,
          isVerified: false,
          attempts: 0,
          expiryTime: new Date(Date.now() + 5 * 60 * 1000),
          updatedAt: new Date()
        },
        { upsert: true }
      );

      return res.json({
        success: true,
        message: result.message,
        expiryMinutes: result.expiryMinutes
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Error sending OTP'
    });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and return token (universal for signup/login)
 * @access  Public
 */
router.post('/verify-otp', [
  body('phone').notEmpty().trim(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('userType').isIn(['buyer', 'farmer']),
  body('userData').optional() // For signup: { name, email, password, ...}
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { phone, otp, userType, userData } = req.body;
    const normalizedPhone = phone.replace(/\D/g, '');

    // Verify OTP in database
    const otpRecord = await OTP.findOne({ phoneNumber: normalizedPhone });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.'
      });
    }

    if (Date.now() > otpRecord.expiryTime) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({
          success: false,
          error: 'Maximum attempts exceeded. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`
      });
    }

    // OTP is valid
    otpRecord.isVerified = true;
    await otpRecord.save();

    let user;
    let isNewUser = false;

    // Check if user exists
    if (userType === 'buyer') {
      user = await Buyer.findOne({ phone: `+${normalizedPhone}` });
    } else {
      user = await Farmer.findOne({ phone: `+${normalizedPhone}` });
    }

    // If signup and user doesn't exist, create new user
    if (!user && userData) {
      const { name, email, password, ...extraData } = userData;

      if (userType === 'buyer') {
        const buyerCount = await Buyer.countDocuments();
        const buyerType = extraData.type || 'Individual';

        user = new Buyer({
          ...extraData,
          code: `B${String(buyerCount + 1).padStart(3, '0')}`,
          name: name || email,
          email: email.toLowerCase(),
          phone: `+${normalizedPhone}`,
          type: buyerType,
          location: extraData.location || 'Not specified',
          isDemo: false,
          role: 'buyer',
          joinedDate: new Date().toISOString().split('T')[0],
          walletBalance: 50000,
          password: password ? await bcrypt.hash(password, await bcrypt.genSalt(10)) : undefined
        });
      } else {
        const farmerCount = await Farmer.countDocuments();
        const districtCode = extraData.district 
          ? extraData.district.substring(0, 2).toUpperCase() 
          : 'XX';

        user = new Farmer({
          ...extraData,
          code: `KA-${districtCode}-${String(farmerCount + 1).padStart(3, '0')}`,
          name: name || email,
          email: email.toLowerCase(),
          phone: `+${normalizedPhone}`,
          village: extraData.village || 'Not specified',
          district: extraData.district || 'Not specified',
          pincode: extraData.pincode || '000000',
          landSize: extraData.landSize || '0 acres',
          isDemo: false,
          role: 'farmer',
          joinedDate: new Date().toISOString().split('T')[0],
          trustScore: 50,
          crops: extraData.crops || [],
          aadhaarVerified: false,
          upiVerified: false,
          landVerified: false,
          language: 'Kannada',
          profileImage: '',
          password: password ? await bcrypt.hash(password, await bcrypt.genSalt(10)) : undefined
        });
      }

      await user.save();
      isNewUser = true;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Please sign up first.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType,
        email: user.email,
        name: user.name,
        isDemo: false,
        role: userType
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data
    const userResponse = {
      id: user._id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: userType,
      isDemo: false,
      walletBalance: userType === 'buyer' ? (user.walletBalance || 50000) : 0,
      trustScore: userType === 'farmer' ? (user.trustScore || 50) : 80
    };

    if (userType === 'farmer') {
      userResponse.village = user.village;
      userResponse.district = user.district;
      userResponse.landSize = user.landSize;
      userResponse.crops = user.crops || [];
    }

    // Clean up OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      token,
      user: userResponse,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Error verifying OTP'
    });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to phone number
 * @access  Public
 */
router.post('/resend-otp', [
  body('phone').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { phone } = req.body;

    const result = await otpService.resendOTP(phone);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        expiryMinutes: result.expiryMinutes
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Error resending OTP'
    });
  }
});

module.exports = router;
