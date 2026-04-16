#!/usr/bin/env node
/**
 * FarmBid WhatsApp Automation Utility (Omnichannel Edition)
 * Integrates shared ChatbotEngine logic for consistant multi-channel experience.
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chatbotEngine = require('../services/ChatbotEngine');

// Configuration
const sessionPath = path.resolve(process.cwd(), '.wwebjs_auth');

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'farmbid-whatsapp',
    dataPath: sessionPath
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let clientReady = false;
let lastQr = null;
let lastAuthFailure = null;

client.on('qr', (qr) => {
  lastQr = qr;
  console.log('\n📱 WhatsApp QR Code generated. Scan to connect to FarmBid:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  clientReady = true;
  lastQr = null;
  console.log('✅ WhatsApp client ready for Omnichannel Chatbot!');
});

client.on('auth_failure', (msg) => {
  clientReady = false;
  lastAuthFailure = msg;
  console.error('❌ WhatsApp Auth failure:', msg);
});

client.on('message', async (msg) => {
  if (msg.from.endsWith('@g.us')) return;

  const from = msg.from;
  const body = msg.body;
  const opts = {};

  if (msg.hasMedia) {
    try {
      const media = await msg.downloadMedia();
      if (media) {
        opts.base64Media = media.data;
        opts.contentType = media.mimetype;
      }
    } catch (err) {
      console.error('[WhatsApp] Media download error:', err);
    }
  }

  try {
    const reply = await chatbotEngine.processMessage(from, body, opts);
    if (reply) {
      await msg.reply(reply);
    }
  } catch (err) {
    console.error('[WhatsApp] Chatbot processing error:', err);
  }
});

client.initialize();

// Notification Helpers (for system-generated messages)
const sendMessage = async ({ to, body }) => {
  if (!clientReady) throw new Error('WhatsApp not ready');
  // Format phone to @c.us if it's just a number
  let chatId = to;
  if (!chatId.includes('@')) {
    chatId = `${to.replace(/\+/g, '')}@c.us`;
  }
  return client.sendMessage(chatId, body);
};

module.exports = {
  isReady: () => clientReady,
  getQrCode: () => lastQr,
  getAuthFailure: () => lastAuthFailure,
  sendWhatsAppMessage: sendMessage,

  // Specific notifications used by backend routes
  notifyFarmerNewBid: (phone, amt, qty, city) =>
    sendMessage({ to: phone, body: `🌾 New Bid! \nAmount: ₹${amt}\nQty: ${qty}kg\nBuyer City: ${city}` }),

  notifyFarmerDealLocked: (phone, id, buyer) =>
    sendMessage({ to: phone, body: `✅ Deal Locked! \nListing: ${id}\nBuyer: ${buyer.name}\nContact: ${buyer.phone}` }),

  notifyFarmerPaymentSent: (phone, amt, upi) =>
    sendMessage({ to: phone, body: `💰 Payment Sent: ₹${amt}\nUPI: ${upi}` }),

  notifyFarmerDispute: (phone, id, reason) =>
    sendMessage({ to: phone, body: `⚠️ Dispute on Listing ${id}\nReason: ${reason}` }),

  notifyFarmerListingExpired: (phone, id) =>
    sendMessage({ to: phone, body: `⌛ Listing Expired: ${id}` })
};
