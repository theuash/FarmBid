const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Delivery = require('../models/Delivery');

/**
 * Ensures a wallet exists for the given ID and role, creating one if necessary.
 */
async function ensureWalletExists(userId, role, defaultBalance = 0) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = new Wallet({
      userId,
      userType: role,
      balance: defaultBalance,
      availableBalance: defaultBalance,
      currency: 'INR'
    });
    await wallet.save();
  }
  return wallet;
}

/**
 * Releases the escrow off-chain by splitting the totalValue between the Farmer (95%) and the Platform (5%).
 * 
 * @param {String} orderId - The Auction/Order ID
 */
async function releaseEscrow(orderId) {
  try {
    // 1. Fetch the auction document to find total value
    // Assuming orderId is either the _id or transactionId
    let auction;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      auction = await Auction.findById(orderId);
    } else {
      auction = await Auction.findOne({ $or: [{ _id: orderId }, { transactionId: orderId }] }); // Fallback lookup
    }

    if (!auction) {
      throw new Error(`Auction/Order with ID ${orderId} not found.`);
    }

    if (auction.escrowReleased) {
      throw new Error(`Escrow mapping for ${orderId} is already released.`);
    }

    // 2. We need a transporter reference. Check Delivery.
    const delivery = await Delivery.findOne({ auctionId: auction._id });
    
    // Fallback pseudo-IDs if they aren't explicitly registered
    const farmerId = auction.farmerId.toString();
    const platformAdminId = 'PLATFORM_ADMIN_VAULT';

    const totalValue = auction.totalValue || 0;
    if (totalValue <= 0) {
      throw new Error('Total value for escrow splitting is invalid or zero.');
    }

    // 3. Split amounts (95% Farmer, 5% Platform)
    const farmerAmount = (totalValue * 95) / 100;
    const platformAmount = totalValue - farmerAmount; // Covers precision gaps for 5%

    // 4. Ensure Wallets exist
    const farmerWallet = await ensureWalletExists(farmerId, 'farmer');
    const platformWallet = await ensureWalletExists(platformAdminId, 'admin');

    // 5. Build Transactions
    const timestamp = new Date();
    const updates = [];

    // --- Farmer ---
    const farmerBefore = farmerWallet.balance;
    farmerWallet.balance += farmerAmount;
    farmerWallet.availableBalance += farmerAmount;
    updates.push(farmerWallet.save());
    updates.push(new WalletTransaction({
      walletId: farmerWallet._id,
      userId: farmerId,
      type: 'release_to_farmer',
      amount: farmerAmount,
      balanceBefore: farmerBefore,
      balanceAfter: farmerWallet.balance,
      description: `Escrow Release: 95% revenue share for order ${orderId}`,
      referenceId: orderId,
      referenceType: 'auction',
      status: 'success'
    }).save());


    // --- Platform Fee ---
    const platformBefore = platformWallet.balance;
    platformWallet.balance += platformAmount;
    platformWallet.availableBalance += platformAmount;
    updates.push(platformWallet.save());
    updates.push(new WalletTransaction({
      walletId: platformWallet._id,
      userId: platformAdminId,
      type: 'fee_charge',
      amount: platformAmount,
      balanceBefore: platformBefore,
      balanceAfter: platformWallet.balance,
      description: `Escrow Release: 5% platform fee for order ${orderId}`,
      referenceId: orderId,
      referenceType: 'auction',
      status: 'success'
    }).save());

    // 6. Update Auction flag
    auction.escrowReleased = true;
    auction.status = 'settled';
    updates.push(auction.save());

    // Execute all save promises consecutively (Mongoose handles concurrent promises unless versions collide, Promise.all handles multiple unique documents nicely)
    await Promise.all(updates);

    return { 
      success: true, 
      farmerAmount, 
      platformAmount 
    };
  } catch (error) {
    console.error('Escrow logic release error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  releaseEscrow,
  ensureWalletExists
};
