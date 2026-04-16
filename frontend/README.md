# FarmBid - Blockchain Agricultural Reverse Auction Platform

FarmBid is a full-stack application for agricultural reverse auctions with blockchain integration. The application has been fully segregated into a **standalone Node.js/Express backend** and a **Next.js frontend**.

---

## Architecture

```
FarmBid/
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js             # Main application page
│   │   └── globals.css
│   ├── components/ui/          # UI component library
│   ├── lib/
│   ├── .env                    # Frontend configuration
│   ├── package.json
│   └── next.config.js
│
└── backend/                     # Node.js/Express Backend
    ├── server.js               # Main Express server
    ├── seed.js                 # Database seeder
    ├── test.js                 # API test suite
    ├── package.json
    ├── .env.example
    ├── config/
    │   └── database.js         # MongoDB connection
    ├── models/                 # Mongoose schemas
    │   ├── Farmer.js
    │   ├── Buyer.js
    │   ├── Listing.js
    │   ├── Bid.js
    │   ├── Auction.js
    │   ├── BlockchainEvent.js
    │   ├── Dispute.js
    │   ├── Delivery.js
    │   ├── Wallet.js
    │   └── WalletTransaction.js
    ├── routes/                 # API route handlers
    │   ├── listings.js
    │   ├── bids.js
    │   ├── farmers.js
    │   ├── buyers.js
    │   ├── auctions.js
    │   ├── blockchain.js
    │   ├── disputes.js
    │   ├── deliveries.js
    │   ├── admin.js
    │   ├── quality.js
    │   ├── wallet.js
    │   └── orders.js
    ├── middleware/
    │   └── validation.js
    └── utils/
        ├── auctionTimer.js
        └── blockchain.js
```

---

## Features

### Core Functionality
- **Reverse Auction System**: Farmers set the base price, buyers bid upwards
- **Real-time Auction Timer**: Dynamic countdown with status updates
- **Quality Analysis**: AI-powered produce quality scoring (simulated)
- **Blockchain Anchoring**: All critical events anchored to Polygon Mainnet (simulated for MVP)
- **Wallet Management**: Buyer wallet with escrow and settlement
- **Dispute Resolution**: Weight mismatch, quality discrepancy handling
- **Delivery Tracking**: Photo verification, geotagging, weight reconciliation
- **Admin Dashboard**: KPIs, fraud detection, platform health monitoring
- **Multi-language Support**: English, Hindi, Kannada (WhatsApp-style chat demo)

### API Endpoints

#### Listings
- `GET /api/listings` - Get all active listings (with status-based filtering)
- `GET /api/listings/:id` - Get specific listing with bids
- `POST /api/listings` - Create new listing (anchored to blockchain)

#### Bids
- `POST /api/bids` - Place a bid (must be higher than current)
- `GET /api/bids` - Get bids (filter by listingId)
- `GET /api/bids/buyer/:buyerId` - Get buyer's bid history

#### Farmers
- `GET /api/farmers` - Get all farmers
- `GET /api/farmers/:id` - Get farmer profile with listings
- `GET /api/farmers/stats/summary` - Get farmer statistics

#### Buyers
- `GET /api/buyers` - Get all buyers
- `GET /api/buyers/:id` - Get buyer profile with bids and won auctions
- `GET /api/buyers/stats/summary` - Get buyer statistics

#### Auctions
- `GET /api/auctions/completed` - Get completed auctions with delivery info

#### Blockchain
- `GET /api/blockchain/events` - Get blockchain events (filterable by type/entityId)
- `GET /api/blockchain/events/tx/:txHash` - Get specific transaction
- `GET /api/blockchain/stats` - Get blockchain statistics

#### Disputes
- `GET /api/disputes` - Get all disputes
- `POST /api/disputes` - File new dispute
- `PUT /api/disputes/:id` - Update dispute status (admin)
- `GET /api/disputes/auction/:auctionId` - Get dispute for auction

#### Deliveries
- `GET /api/deliveries` - Get all deliveries (filterable)
- `POST /api/deliveries` - Schedule delivery
- `PUT /api/deliveries/:id` - Update delivery status
- `GET /api/deliveries/auction/:auctionId` - Get delivery for auction

#### Admin
- `GET /api/admin/kpis` - Platform key performance indicators
- `GET /api/admin/districts` - District-wise statistics
- `GET /api/admin/fraud-alerts` - Suspicious activity alerts
- `GET /api/admin/platform-health` - 24-hour platform health metrics

#### Quality
- `POST /api/quality/analyze` - AI quality analysis (simulated)
- `POST /api/quality/manual-score` - Manual quality scoring (admin)

#### Wallet
- `GET /api/wallet/balance?buyerId=:buyerId` - Get wallet balance
- `POST /api/wallet/topup` - Top up wallet
- `GET /api/wallet/transactions/:userId` - Transaction history
- `GET /api/wallet/:userId` - Full wallet info

#### Orders
- `GET /api/orders` - Get orders for buyer/completed auctions
- `GET /api/orders/:id` - Get order details

---

## Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6.0 or higher) - running locally or accessible remotely
- **npm** or **yarn** package manager

---

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to project directory
cd E:/Hackthon/BGSCET/BGSCET/FarmBid

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment

The frontend uses `.env`:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

The backend uses `backend/.env` (copy from `.env.example`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=farmbid_db
PORT=3001
CORS_ORIGINS=http://localhost:3000
```

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# On Windows (if MongoDB is in PATH)
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Seed the Database

```bash
npm run backend:seed
```

This will populate the database with sample farmers, buyers, listings, bids, and blockchain events.

### 5. Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run backend:dev

# Or production mode
npm run backend:start
```

The backend API will be available at `http://localhost:3001/api`

### 6. Start the Frontend (in another terminal)

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

---

## Testing

### Backend API Tests

```bash
# Make sure backend server is running on port 3001
npm run backend:start

# In another terminal, run the test suite
npm run backend:test
```

Or run directly:
```bash
cd backend
node test.js
```

### Manual API Testing

The backend provides a comprehensive health check endpoint:

```bash
curl http://localhost:3001/api/health
```

---

## Project Structure

### Frontend (`/frontend`)

The Next.js frontend is a single-page application with:
- `frontend/app/page.js`: Main component with full UI logic
- `frontend/app/layout.js`: Root layout with theme provider
- `frontend/components/ui/`: Radix UI based component library
- All UI in one file for rapid development

### Backend (`/backend`)

Enterprise-grade Node.js/Express backend:
- **MongoDB + Mongoose**: Persistent data storage with relationships
- **CORS Enabled**: Allows requests from frontend origin
- **Validation**: Request validation via express-validator
- **Security**: Helmet.js security headers, rate limiting
- **Logging**: Morgan HTTP request logging
- **Blockchain**: Simulated anchoring (ready for real Web3 integration)
- **RESTful API**: All endpoints follow REST conventions

---

## Database Schema

### Models

1. **Farmer**: Farmer profiles with verification status, crops, location
2. **Buyer**: Buyer profiles with wallet, trust score, type
3. **Listing**: Auction listings with quality metrics, timer
4. **Bid**: Individual bids placed by buyers
5. **Auction**: Completed auction/settlement records
6. **BlockchainEvent**: All blockchain transaction records
7. **Dispute**: Dispute cases with resolution tracking
8. **Delivery**: Delivery records with photos, geotags
9. **Wallet**: Wallet balances and KYC status
10. **WalletTransaction**: Transaction history

---

## API Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": "...",
  "error": "Error message if any"
}
```

Exceptions include list endpoints which directly contain the array with a `count` field.

---

## Development Notes

### Updating Models

If you modify any model in `/backend/models`, you should:
1. Update the seed data in `backend/seed.js` if needed
2. Re-run seeding if structural changes require new data

### Adding New Endpoints

1. Create/update route handler in corresponding file in `/backend/routes/`
2. Add validation rules in `backend/middleware/validation.js` if needed
3. Update the `backend/seed.js` if new data is needed
4. Update frontend `app/page.js` to call the new endpoint

### Blockchain Integration

The blockchain integration is currently simulated in `backend/utils/blockchain.js`. To integrate with real Polygon/Ethereum:

1. Install Web3 provider: `npm install ethers` or `viem`
2. Update `anchorToBlockchain()` function to make actual contract calls
3. Add smart contract ABIs to `/backend/contracts/`
4. Configure network provider URL in `.env`

---

## Deployment

### Backend

```bash
cd backend
npm install --production
NODE_ENV=production npm start
```

### Frontend

```bash
npm install
npm run build
npm start
```

### Environment Variables

Ensure production `.env` files have correct values:
- MongoDB connection string
- CORS origins for production domain
- Blockchain provider URL (when integrating)

---

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or Docker container
- Check connection string in `backend/.env`
- Verify port 27017 is available

### CORS Errors
- Check `CORS_ORIGINS` setting in `backend/.env`
- Frontend must use `NEXT_PUBLIC_API_URL` matching CORS origin

### Port Already in Use
- Backend default: 3001
- Frontend default: 3000
- Change ports in `.env` files if needed

### API Returns Empty Data
- Ensure database is seeded: `npm run backend:seed`
- Check MongoDB is connected (backend console shows "MongoDB Connected")

---

## License

MIT License - FarmBid Platform

---

## Support

For issues or questions, please refer to the project repository or contact the development team.
