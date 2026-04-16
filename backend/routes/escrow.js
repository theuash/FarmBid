const express = require('express');
const router = express.Router();
const escrowService = require('../blockchain/escrowService');
const escrowDb = require('../db/escrowDb');
const escrowLogic = require('../services/escrowLogic');

const verifySecret = (req, res, next) => {
  const { secret } = req.body;
  if (!secret || secret !== process.env.INTERNAL_WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid secret' });
  }
  next();
};

// POST /api/escrow/lock
router.post('/lock', async (req, res) => {
  try {
    const { orderId, farmerAddress, amountMATIC } = req.body;

    if (!orderId || !farmerAddress || !amountMATIC) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const onChainRes = await escrowService.lockFunds(orderId, farmerAddress, amountMATIC);
    
    if (!onChainRes.success) {
      return res.status(500).json({ success: false, error: onChainRes.error });
    }

    escrowDb.insertOrder({
      orderId,
      buyerAddr: '', // If we have buyer address, we could add it, but it's not in the requested payload.
      farmerAddr: farmerAddress,
      amountMatic: amountMATIC,
      txHash: onChainRes.txHash,
      status: 'LOCKED'
    });

    return res.status(200).json({
      success: true,
      txHash: onChainRes.txHash,
      orderId
    });
  } catch (error) {
    console.error('Lock error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/escrow/approve
router.post('/approve', verifySecret, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing orderId' });
    }

    const onChainRes = await escrowService.approveRelease(orderId);
    
    if (!onChainRes.success) {
      return res.status(500).json({ success: false, error: onChainRes.error });
    }

    escrowDb.updateOrderStatus(orderId, 'RELEASED');

    // Perform off-chain split logic mapping Fiat percentages to User Wallets
    const offChainRes = await escrowLogic.releaseEscrow(orderId);
    
    if (!offChainRes.success) {
      console.error('Offchain fiat split failed:', offChainRes.error);
      // Soft failure - blockchain succeeded but internal ledger failed. Might want to alert admin.
    }

    return res.status(200).json({
      success: true,
      txHash: onChainRes.txHash,
      splits: offChainRes.success ? {
        farmer: offChainRes.farmerAmount,
        platform: offChainRes.platformAmount
      } : null
    });
  } catch (error) {
    console.error('Approve error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/escrow/penalize-farmer
router.post('/penalize-farmer', verifySecret, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing orderId' });
    }

    const onChainRes = await escrowService.penalizeFarmer(orderId);
    
    if (!onChainRes.success) {
      return res.status(500).json({ success: false, error: onChainRes.error });
    }

    escrowDb.updateOrderStatus(orderId, 'FARMER_PENALIZED', reason || 'No reason provided');

    return res.status(200).json({
      success: true,
      txHash: onChainRes.txHash
    });
  } catch (error) {
    console.error('Penalize farmer error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/escrow/penalize-buyer
router.post('/penalize-buyer', verifySecret, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing orderId' });
    }

    const onChainRes = await escrowService.penalizeBuyer(orderId);
    
    if (!onChainRes.success) {
      return res.status(500).json({ success: false, error: onChainRes.error });
    }

    escrowDb.updateOrderStatus(orderId, 'BUYER_PENALIZED', reason || 'No reason provided');

    return res.status(200).json({
      success: true,
      txHash: onChainRes.txHash
    });
  } catch (error) {
    console.error('Penalize buyer error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/escrow/status/:orderId
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Read from DB
    const dbData = escrowDb.getOrder(orderId);
    
    // Fetch from Chain
    const chainRes = await escrowService.getOrderStatus(orderId);
    
    return res.status(200).json({
      db: dbData || null,
      chain: chainRes.success ? chainRes.data : { error: chainRes.error }
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
