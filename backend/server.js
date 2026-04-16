const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

// Import routes
const listingsRouter = require('./routes/listings');
const bidsRouter = require('./routes/bids');
const farmersRouter = require('./routes/farmers');
const buyersRouter = require('./routes/buyers');
const { router: auctionsRouter } = require('./routes/auctions');
const blockchainRouter = require('./routes/blockchain');
const disputesRouter = require('./routes/disputes');
const deliveriesRouter = require('./routes/deliveries');
const whatsappRouter = require('./routes/whatsapp');
const adminRouter = require('./routes/admin');
const qualityRouter = require('./routes/quality');
const walletRouter = require('./routes/wallet');
const paymentsRouter = require('./routes/paymentRoutes');
const ordersRouter = require('./routes/orders');
const escrowRouter = require('./routes/escrow');
const authRouter = require('./routes/auth');
const statsRouter = require('./routes/stats');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB (optional - continues without if unavailable)
connectDB().catch(err => {
  console.log('⚠️  Running without MongoDB:', err.message);
});

// Initialize WhatsApp client
require('./utils/whatsapp');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS === '*' ? '*' : (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*'),
  credentials: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to allow for polling and development
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Logging middleware
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded media
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/listings', listingsRouter);
app.use('/api/bids', bidsRouter);
app.use('/api/farmers', farmersRouter);
app.use('/api/buyers', buyersRouter);
app.use('/api/auctions', auctionsRouter);
app.use('/api/blockchain', blockchainRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quality', qualityRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/escrow', escrowRouter);
app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FarmBid API v1.0',
    tagline: 'Farmers set the price. Buyers compete upward. Blockchain guarantees it all.',
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.route?.path || req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🌾 FarmBid Backend Server');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but do NOT crash the server
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
