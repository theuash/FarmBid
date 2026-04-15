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

// Import models
const Buyer = require('../models/Buyer');
const Farmer = require('../models/Farmer');
const Admin = require('../models/Admin'); // We'll create this if it doesn't exist

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
 * @desc    Register a new buyer
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

    const { email, password, name, phone, ...extraData } = req.body;

    // Check if user already exists
    let existingUser = await Buyer.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique code for buyer
    const buyerCount = await Buyer.countDocuments();
    const code = `B${String(buyerCount + 1).padStart(3, '0')}`;

    // Set defaults for required fields not in form
    const buyerType = extraData.type || 'Individual'; // Default buyer type

    const user = new Buyer({
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

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: 'buyer',
        email: user.email,
        name: user.name,
        isDemo: false,
        role: 'buyer'
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
      role: 'buyer',
      isDemo: false,
      walletBalance: 50000,
      trustScore: 80
    };

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

module.exports = router;
