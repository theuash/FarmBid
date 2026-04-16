# 🌾 FarmBid: Decentralized Agricultural Marketplace

> **"Farmers set the price. Buyers compete upward. Blockchain guarantees it all."**

FarmBid is a production-ready, full-stack agricultural reverse auction platform designed to empower farmers and agents while providing buyers with authentic, quality-verified produce. By leveraging blockchain for transparency and an omnichannel approach (Web + WhatsApp), FarmBid brings trust to the first-mile supply chain.

---

## 🚀 Key Modern Features

### 💎 Transparency & Trust
- **Blockchain Anchoring**: Every listing, bid, and settlement is anchored to the Polygon Mainnet (simulated with hash generation), creating a permanent, tamper-proof record.
- **AI Quality Analysis**: Uses simulated computer vision to analyze produce photos, generating objective quality scores for Buyers.
- **On-Chain Ledger**: A public timeline of all critical events to prevent data manipulation.

### 📱 Omnichannel Access
- **WhatsApp Bot**: Farmers and Agents can create listings, check prices, and receive real-time outbid notifications via WhatsApp.
- **Agent Dashboard**: A specialized interface for Agents to manage multiple farmers, collect auction funds, and process producer payouts.

### 💰 Secure Financial Loop
- **Escrow Wallet**: Integrated buyer wallet where funds are locked during the bid phase and released only upon auction finalization.
- **Integrated Payments**: Support for Razorpay and direct UPI QR code generation for seamless wallet top-ups.
- **Agent Collections**: Automatic collection of auction wins into the Agent's ledger, with one-click payout capability to the original Producer.

### ⚡ Real-Time Auction Engine
- **Reverse Auctioning**: Buyers bid *upward* starting from the Farmer's reserve price.
- **Real-Time Polling**: Frontend synchronizes automatically with the backend auction timer.
- **Auto-Settlement**: Auctions finalize immediately upon expiry, deducting funds from the winner and creating order records.

---

## 🏗️ Architecture

```
FarmBid/
├── frontend/                # Next.js 14 + Tailwind CSS + Shadcn UI
│   ├── app/                 # Main App Router (Dashboard, Login, Orders)
│   ├── components/ui/       # Premium UI component library
│   └── lib/                 # Shared utilities
│
└── backend/                 # Node.js + Express + MongoDB
    ├── routes/              # Modular API handlers (Listings, Auctions, Wallet, etc.)
    ├── models/              # Mongoose schemas for FarmBid ecosystem
    ├── utils/               # WhatsApp client, Blockchain anchor, Wallet helpers
    ├── services/            # ChatbotEngine, AIService, EscrowLogic
    └── server.js            # Main entry point
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js**: v18+
- **MongoDB**: Local or Atlas instance
- **Dependencies**: React, Next.js, Express, Mongoose, WhatsApp-Web.js, Puppeteer.

### 2. Backend Config (`backend/.env`)
```env
PORT=3001
MONGO_URL=your_mongodb_url
DB_NAME=farmbid_db
JWT_SECRET=your_jwt_secret
CORS_ORIGINS=http://localhost:3000
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

### 3. Frontend Config (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key
```

### 4. Running the App
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## 📖 Role Workflows

### 👨‍🌾 The Agent
1. **List Produce**: Upload produce details via Web or WhatsApp.
2. **Track Auctions**: Monitor live bidding on the Dashboard.
3. **Collect Funds**: After auction ends, funds appear in the "Collected Funds" ledger.
4. **Pay Farmer**: Click "Pay Farmer" to record the payout and notify the producer.

### 🛒 The Buyer
1. **Browse**: Explore quality-verified listings.
2. **Bid**: Place bids with locked escrow.
3. **Pay**: Top up wallet via UPI/Razorpay.
4. **Track**: Monitor won auctions in "My Orders".

---

## 🛡️ Security & Performance
- **Rate Limiting**: Express-rate-limit prevents bot spam on the API.
- **Transaction Safety**: Atomic wallet updates using Mongoose.
- **JWT Protection**: Secure authentication flows for sensitive operations.
- **Graceful Fault Tolerance**: WhatsApp client stays alive even if Puppeteer contexts fail occasionally.

---

## 📜 License
© 2026 FarmBid - Empowering Rural Producers. Built for the Future of Agriculture.
