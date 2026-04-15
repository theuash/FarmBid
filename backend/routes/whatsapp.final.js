const express = require('express');
const router = express.Router();
const {
  sendWhatsAppMessage,
  isReady,
  getQrCode,
  getAuthFailure,
  notifyFarmerNewBid,
  notifyFarmerDealLocked,
  notifyFarmerPaymentSent,
  notifyFarmerDispute,
  notifyFarmerListingExpired
} = require('../utils/whatsapp.final');

const ensureClientReady = (res) => {
  if (!isReady()) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp client is not ready. Scan the QR code and wait for authentication.'
    });
  }
  return null;
};

router.post('/send', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ success: false, error: 'phone and text are required.' });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await sendWhatsAppMessage({ to: phone, body: text });
    res.json({ success: true, phone, text });
  } catch (err) {
    console.error('[WhatsAppRoute] send error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to send message.' });
  }
});

router.get('/status', (req, res) => {
  const qr = getQrCode();
  const authFailure = getAuthFailure();

  res.json({
    ready: isReady(),
    qr: qr || null,
    authFailure: authFailure || null
  });
});

router.post('/notify-bid', async (req, res) => {
  const { farmerPhone, bidAmount, quantity, buyerCity } = req.body;
  if (!farmerPhone || !bidAmount || !quantity) {
    return res.status(400).json({
      success: false,
      error: 'farmerPhone, bidAmount, and quantity are required.'
    });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await notifyFarmerNewBid(farmerPhone, bidAmount, quantity, buyerCity);
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsAppRoute] notify-bid error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to notify farmer of new bid.' });
  }
});

router.post('/notify-deal-locked', async (req, res) => {
  const { farmerPhone, listingId, buyerDetails } = req.body;
  if (!farmerPhone || !listingId) {
    return res.status(400).json({
      success: false,
      error: 'farmerPhone and listingId are required.'
    });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await notifyFarmerDealLocked(farmerPhone, listingId, buyerDetails);
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsAppRoute] notify-deal-locked error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to notify farmer of locked deal.' });
  }
});

router.post('/notify-payment', async (req, res) => {
  const { farmerPhone, amount, upiId } = req.body;
  if (!farmerPhone || !amount || !upiId) {
    return res.status(400).json({
      success: false,
      error: 'farmerPhone, amount, and upiId are required.'
    });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await notifyFarmerPaymentSent(farmerPhone, amount, upiId);
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsAppRoute] notify-payment error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to notify farmer of payment.' });
  }
});

router.post('/notify-dispute', async (req, res) => {
  const { farmerPhone, listingId, reason } = req.body;
  if (!farmerPhone || !listingId || !reason) {
    return res.status(400).json({
      success: false,
      error: 'farmerPhone, listingId, and reason are required.'
    });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await notifyFarmerDispute(farmerPhone, listingId, reason);
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsAppRoute] notify-dispute error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to notify farmer of dispute.' });
  }
});

router.post('/notify-listing-expired', async (req, res) => {
  const { farmerPhone, listingId } = req.body;
  if (!farmerPhone || !listingId) {
    return res.status(400).json({
      success: false,
      error: 'farmerPhone and listingId are required.'
    });
  }

  const errorResponse = ensureClientReady(res);
  if (errorResponse) return errorResponse;

  try {
    await notifyFarmerListingExpired(farmerPhone, listingId);
    res.json({ success: true });
  } catch (err) {
    console.error('[WhatsAppRoute] notify-listing-expired error', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to notify farmer of expired listing.' });
  }
});

module.exports = router;
