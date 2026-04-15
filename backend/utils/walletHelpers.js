const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { v4: uuidv4 } = require('uuid');

/**
 * Checks if a user has sufficient available balance.
 * @param {string} userId 
 * @param {number} amount 
 * @returns {Promise<boolean>}
 */
async function checkBalance(userId, amount) {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) return false;
  return wallet.availableBalance >= amount;
}

/**
 * Locks funds for a bid.
 * @param {string} userId 
 * @param {number} amount 
 * @param {string} listingId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function lockFunds(userId, amount, listingId) {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return { success: false, error: 'Wallet not found' };
    
    if (wallet.availableBalance < amount) {
      return { success: false, error: 'Insufficient available balance' };
    }

    const balanceBefore = wallet.balance;
    wallet.availableBalance -= amount;
    wallet.lockedAmount += amount;
    await wallet.save();

    // Log transaction
    await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: 'hold',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Funds locked for bid on listing ${listingId}`,
      referenceId: uuidv4(),
      referenceType: 'bid_lock',
      status: 'completed'
    });

    return { success: true };
  } catch (error) {
    console.error('Error locking funds:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlocks funds (reverses a lock).
 * @param {string} userId 
 * @param {number} amount 
 * @param {string} listingId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function unlockFunds(userId, amount, listingId) {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return { success: false, error: 'Wallet not found' };

    const balanceBefore = wallet.balance;
    wallet.availableBalance += amount;
    wallet.lockedAmount = Math.max(0, wallet.lockedAmount - amount);
    await wallet.save();

    // Log transaction
    await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: 'release',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Funds released from outbid listing ${listingId}`,
      referenceId: uuidv4(),
      referenceType: 'bid_release',
      status: 'completed'
    });

    return { success: true };
  } catch (error) {
    console.error('Error unlocking funds:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  checkBalance,
  lockFunds,
  unlockFunds
};
