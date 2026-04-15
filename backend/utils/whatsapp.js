#!/usr/bin/env node
/**
 * FarmBid WhatsApp Automation Utility
 * Uses whatsapp-web.js with Puppeteer for browser automation
 * Enhanced with interactive buttons and list messages
 */

const { Client, LocalAuth, Buttons, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const {
  verifyAadhaar,
  verifyOTP,
  verifyUPI,
  createListing
} = require('./mockAPIs');

let Listing, FarmerModel;
try {
  Listing = require('../models/Listing');
  FarmerModel = require('../models/Farmer');
} catch (err) {
  console.warn('[WhatsApp] MongoDB models not available:', err.message);
}

// Configuration
const sessionPath = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../.wwebjs_auth');

const uploadDir = path.resolve(process.cwd(), 'uploads/listings');

// In-memory stores
const farmerStore = new Map();
const listingStore = new Map();
const pendingWhatsAppMessages = []; // Queue for messages when client not ready

// Localized strings
const t = (key, lang = 'en', data = {}) => {
  const strings = {
    en: {
      menu: (name) => `🏠 *${name}, what would you like to do?*`,
      reg_complete: (name) => `Registration complete, ${name}!`,
      step_photo: '📸 *Step 1/4: Photo*\n\nPlease send a clear photo of your produce.\n\n_Reply 0 to Cancel_',
      listing_started: '📸 *Listing Started!*\n\n✅ Photo received.',
      step_produce: '📦 *Step 2/4:* What are you selling?',
      step_weight: (prod) => `✅ *${prod}* noted!\n\n⚖️ *Step 3/4:* Send total weight in kg.\nExample: 500`,
      step_price: (kg) => `✅ *${kg}kg* noted!\n\n💰 *Step 4/4:* What is your min price per kg?\nExample: 40`,
      step_harvest: '✅ *Price noted!*\n\n🗓️ When will it be ready?',
      listing_live: (id, name, qty, price) => `🎉 *CONGRATS! YOUR LISTING IS LIVE!*\n\n🔹 *ID:* ${id}\n🔹 *Item:* ${name}\n🔹 *Weight:* ${qty}kg\n🔹 *Min Price:* ₹${price}/kg\n\n🚀 Buyers are being notified!`,
      cancel_back: '🏠 *Returned to Main Menu*',
      no_active: '📭 You have no active listings right now.',
      trust_score: (score) => `📊 Your trust score is *${score}/100*.`,
      invalid_price: '⚠️ Please send price as a number (e.g. 40).',
      invalid_weight: '⚠️ Please send weight as a number (e.g. 100).',
      invalid_name: '⚠️ Select a produce from the list or type the name.',
      step_location: '📍 *Step 5/5: Location*\n\nPlease share your location by:\n1️⃣ Tapping the 📎 (paperclip) icon → Location → Send\n2️⃣ Or type your village/town name manually\n\n_This helps buyers estimate delivery costs._',
      location_received: (addr) => `✅ Location received: ${addr}\n\nCreating your listing...`,
      invalid_location: '⚠️ Could not get location. Please try again or type your village/town name.',
      extra_photo: (count) => `✅ Extra photo added (${count} total).\n\nWhat is the name of your produce?`,
      notify_bid: (amt, qty, city) => `🎯 *NEW BID RECEIVED!*\n\n💰 *Bid Amount:* ₹${amt}/kg\n⚖️ *Quantity:* ${qty}kg\n📍 *From:* ${city}\n\nCheck your dashboard for details!`,
      notify_locked: (id) => `🔒 *DEAL LOCKED!*\n\nYour listing ${id} has been locked with a buyer.\n\nPayment will be processed soon.`,
      notify_payment: (amt) => `💳 *PAYMENT SENT!*\n\n₹${amt} has been sent to your UPI ID.\n\nCheck your UPI app for confirmation.`,
      notify_dispute: (id, reason) => `⚠️ *DISPUTE RAISED*\n\nListing ${id}: ${reason}\n\nOur team will contact you soon.`,
      notify_expired: (id) => `⏰ *LISTING EXPIRED*\n\nYour listing ${id} has expired.\n\nCreate a new listing to continue selling.`
    },
    kn: {
      menu: (name) => `🏠 *${name}, ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?*`,
      reg_complete: (name) => `ನೋಂದಣಿ ಪೂರ್ಣಗೊಂಡಿದೆ, ${name}!`,
      step_photo: '📸 *ಹಂತ 1/4: ಫೋಟೋ*\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಉತ್ಪನ್ನದ ಸ್ಪಷ್ಟ ಫೋಟೋ ಕಳಿಸಿ.\n\n_ರದ್ದು ಮಾಡಲು 0 ಒತ್ತಿರಿ_',
      listing_started: '📸 *ಪಟ್ಟಿ ಪ್ರಾರಂಭವಾಗಿದೆ!*\n\n✅ ಫೋಟೋ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.',
      step_produce: '📦 *ಹಂತ 2/4:* ನೀವು ಏನು ಮಾರಾಟ ಮಾಡುತ್ತಿದ್ದೀರಿ?',
      step_weight: (prod) => `✅ *${prod}* ಗುರುತಿಸಲಾಗಿದೆ!\n\n⚖️ *ಹಂತ 3/4:* ಒಟ್ಟು ತೂಕವನ್ನು ಕೆಜಿಯಲ್ಲಿ ಕಳಿಸಿ.\nಉದಾಹರಣೆ: 500`,
      step_price: (kg) => `✅ *${kg}kg* ಗುರುತಿಸಲಾಗಿದೆ!\n\n💰 *ಹಂತ 4/4:* ಕನಿಷ್ಠ ಬೆಲೆ ಎಷ್ಟು? (ಒಂದು ಕೆಜಿಗೆ)\nಉದಾಹರಣೆ: 40`,
      step_harvest: '✅ *ಬೆಲೆ ಗುರುತಿಸಲಾಗಿದೆ!*\n\n🗓️ ಇದು ಯಾವಾಗ ಸಿದ್ಧವಾಗುತ್ತದೆ?',
      listing_live: (id, name, qty, price) => `🎉 *ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಪಟ್ಟಿ ಸಕ್ರಿಯವಾಗಿದೆ!*\n\n🔹 *ID:* ${id}\n🔹 *ವಸ್ತು:* ${name}\n🔹 *ತೂಕ:* ${qty}kg\n🔹 *ಕನಿಷ್ಠ ಬೆಲೆ:* ₹${price}/kg\n\n🚀 ಖರೀದಿದಾರರಿಗೆ ತಿಳಿಸಲಾಗಿದೆ!`,
      cancel_back: '🏠 *ಮುಖ್ಯ ಮೆನುಗೆ ಹಿಂತಿರುಗಲಾಗಿದೆ*',
      no_active: '📭 ನಿಮ್ಮ ಬಳಿ ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳಿಲ್ಲ.',
      trust_score: (score) => `📊 ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹತೆ ಸ್ಕೋರ್ *${score}/100* ಆಗಿದೆ.`,
      invalid_price: '⚠️ ಬೆಲೆಯನ್ನು ಸಂಖ್ಯೆಯಲ್ಲಿ ಕಳಿಸಿ (ಉದಾ: 40).',
      invalid_weight: '⚠️ ತೂಕವನ್ನು ಸಂಖ್ಯೆಯಲ್ಲಿ ಕಳಿಸಿ (ಉದಾ: 100).',
      invalid_name: '⚠️ ಪಟ್ಟಿಯಿಂದ ಆಯ್ಕೆ ಮಾಡಿ ಅಥವಾ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ.',
      step_location: '📍 *ಹಂತ 5/5: ಸ್ಥಳವನ್ನು ಕಳಿಸಿ*\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ:\n1️⃣ 📎 (ಪೇಪರುಕ್ಲಿಪ್) ಐಕಾನ್ -> ಸ್ಥಳ -> ಕಳಿಸಿ\n2️⃣ ಅಥವಾ ನಿಮ್ಮ ಗ್ರಾಮ/ನಗರದ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ\n\n_ಇದು ನಿರ್ವಹಿಸುವವರಿಗೆ ಸಂಚಾರ ವೆಚುಕಾಲು ಪರಿಧಿ ಅಂದಿಸುತ್ತದೆ._',
      location_received: (addr) => `✅ ಸ್ಥಳ ಪಡೆಯಲಾಗಿದೆ: ${addr}\n\nನಿಮ್ಮ ಪಟ್ಟಿಯನ್ನು ರಚಿಸುತ್ತದೆ...`,
      invalid_location: '⚠️ ಸ್ಥಳವನ್ನು ಪಡೆಯಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಮರುಪರೀಕ್ಷಿಸಿ ಅಥವಾ ನಿಮ್ಮ ಗ್ರಾಮದ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ.',
      extra_photo: (count) => `✅ ಹೆಚ್ಚುವರಿ ಫೋಟೋ ಸೇರಿಸಲಾಗಿದೆ (${count} ಒಟ್ಟು).\n\nನಿಮ್ಮ ಉತ್ಪನ್ನದ ಹೆಸರೇನು?`,
      notify_bid: (amt, qty, city) => `🎯 *ಹೊಸ ಬಿಡ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!*\n\n💰 *ಬಿಡ್ ಮೊತ್ತ:* ₹${amt}/kg\n⚖️ *ಪ್ರಮಾಣ:* ${qty}kg\n📍 *ಇಂದ:* ${city}\n\nವಿವರಗಳಿಗೆ ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪರಿಶೀಲಿಸಿ!`,
      notify_locked: (id) => `🔒 *ಒಪ್ಪಂದ ಲಾಕ್ ಆಗಿದೆ!*\n\nನಿಮ್ಮ ಪಟ್ಟಿ ${id} ಖರೀದಿದಾರರೊಂದಿಗೆ ಲಾಕ್ ಆಗಿದೆ.\n\nಪಾವತಿಯನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತದೆ.`,
      notify_payment: (amt) => `💳 *ಪಾವತಿ ಕಳುಹಿಸಲಾಗಿದೆ!*\n\n₹${amt} ನಿಮ್ಮ UPI ID ಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.\n\nದೃಢೀಕರಣಕ್ಕಾಗಿ ನಿಮ್ಮ UPI ಅಪ್ಲಿಕೇಶನ್ ಪರಿಶೀಲಿಸಿ.`,
      notify_dispute: (id, reason) => `⚠️ *ವಿವಾದ ಉತ್ಪನ್ನವಾಗಿದೆ*\n\nಪಟ್ಟಿ ${id}: ${reason}\n\nನಮ್ಮ ತಂಡ ನಿಮ್ಮನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಸಂಪರ್ಕಿಸುತ್ತದೆ.`,
      notify_expired: (id) => `⏰ *ಪಟ್ಟಿ ಅವಧಿ ಮುಗಿದಿದೆ*\n\nನಿಮ್ಮ ಪಟ್ಟಿ ${id} ಅವಧಿ ಮುಗಿದಿದೆ.\n\nಮಾರಾಟವನ್ನು ಮುಂದುವರಿಸಲು ಹೊಸ ಪಟ್ಟಿ ರಚಿಸಿ.`
    }
  };

  const res = strings[lang][key];
  if (typeof res === 'function') return res(...Object.values(data));
  return res || strings.en[key] || key;
};

// Client state
let client = null;
let clientReady = false;
let lastQr = null;
let lastAuthFailure = null;

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to ensure upload directory:', err);
  }
};

// Helper functions
const hashAadhaar = (aadhaar) => {
  return crypto.createHash('sha256').update(aadhaar).digest('hex');
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.toString().replace(/[^0-9+]/g, '');
  if (!digits) return null;
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const formatPhone = (phone) => {
  if (!phone) return null;
  const extracted = phone.toString().replace(/^\+?([0-9]+)@.*$/, '$1');
  if (/\d/.test(extracted)) {
    return extracted;
  }
  return null;
};

const getWhatsAppId = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Invalid phone number for WhatsApp delivery');
  }
  const digits = normalized.replace(/^\+/, '');
  return `${digits}@c.us`;
};

const getBrowserExecutable = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const chromePath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe');
    const edgePath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    if (fs.existsSync(chromePath)) return chromePath;
    if (fs.existsSync(edgePath)) return edgePath;
  }
  const defaultPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const bundledPath = puppeteer.executablePath();
    if (bundledPath && fs.existsSync(bundledPath)) return bundledPath;
  } catch (err) { }
  console.warn('[WhatsApp] No browser executable found.');
  return null;
};

const browserExecutablePath = getBrowserExecutable();
const puppeteerOptions = {
  headless: process.env.WHATSAPP_HEADLESS === 'true',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1280,800'
  ]
};
if (browserExecutablePath) puppeteerOptions.executablePath = browserExecutablePath;

const cleanupStaleLocks = () => {
  try {
    const sessionDir = path.join(sessionPath, 'session-farmbid-whatsapp');
    if (fs.existsSync(sessionDir)) {
      const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
      for (const lockFile of lockFiles) {
        const lockPath = path.join(sessionDir, 'Default', lockFile);
        if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
        const rootLockPath = path.join(sessionDir, lockFile);
        if (fs.existsSync(rootLockPath)) fs.unlinkSync(rootLockPath);
      }
    }
  } catch (err) { }
};

// Message queue disabled - using msg.reply() only to avoid No LID errors
// All communication now via msg.reply() which maintains proper session context
const messageQueue = [];
let isProcessingQueue = false;
const maxConcurrentMessages = 5;

// Send interactive buttons with optimized retry logic
// DISABLED: Button sending causes "No LID for user" errors
// Only use msg.reply() which maintains proper session context
const sendInteractiveButtons = async (msg, body, buttons) => {
  // Stub - all communication now through msg.reply() in sendReply()
  throw new Error('Use sendReply() instead');
};

// DISABLED: Queue system no longer needed
// All communication now through msg.reply()
const processMessageQueue = async () => {
  // Stub - using msg.reply() only
};

// Send list message (for 4+ options) with queue support
const sendListMessage = async (msg, body, sections) => {
  // DISABLED: List/button sending causes "No LID for user" errors
  // All communication now through msg.reply() only  
  throw new Error('Use sendReply() instead - it handles formatting internally');
};

// WhatsApp client initialization
const initClient = async () => {
  if (!Client || !LocalAuth) {
    console.error('[WhatsApp] whatsapp-web.js not loaded properly');
    return;
  }
  if (client) {
    try { await client.destroy(); } catch (err) { }
    client = null;
    clientReady = false;
  }
  cleanupStaleLocks();
  try {
    client = new Client({
      authStrategy: new LocalAuth({ clientId: 'farmbid-whatsapp', dataPath: sessionPath }),
      puppeteer: puppeteerOptions
    });
    client.on('qr', (qr) => {
      lastQr = qr;
      lastAuthFailure = null;
      console.log('\n========================================');
      console.log('📱 Scan this QR code with WhatsApp:');
      console.log('========================================');
      qrcode.generate(qr, { small: true });
      console.log('========================================\n');
    });
    client.on('ready', () => {
      clientReady = true;
      console.log('✅ WhatsApp client is ready and authenticated!');
      flushPendingMessages();
    });
    client.on('authenticated', () => console.log('[WhatsApp] Authentication successful'));
    client.on('auth_failure', (msg) => {
      clientReady = false;
      lastAuthFailure = msg;
      console.error('❌ WhatsApp authentication failed:', msg);
    });
    client.on('disconnected', async (reason) => {
      clientReady = false;
      console.warn('⚠️ WhatsApp client disconnected:', reason);
      try { await client.destroy(); } catch (err) { }
      setTimeout(() => initClient(), 5000);
    });
    client.on('message', async (msg) => {
      try {
        console.log('[WhatsApp] Incoming message', {
          from: msg.from,
          type: msg.type,
          body: msg.body,
          selectedButtonId: msg.selectedButtonId,
          selectedRowId: msg.selectedRowId
        });
        if (!clientReady) {
          console.warn('[WhatsApp] Client not ready, ignoring incoming message');
          return;
        }
        if (msg.from.endsWith('@g.us')) {
          console.log('[WhatsApp] Group message ignored');
          return;
        }
        await handleFarmerMessage(msg);
      } catch (err) {
        console.error('[WhatsApp] Message handler error:', err.message, err.stack);
        // Don't crash on message errors
      }
    });
    await client.initialize();
  } catch (err) {
    console.error('[WhatsApp] ⚠️ Failed to initialize client:', err.message);
    clientReady = false;
    client = null;
  }
};

const flushPendingMessages = async () => {
  if (pendingWhatsAppMessages.length === 0) return;
  console.log(`[WhatsApp] Flushing ${pendingWhatsAppMessages.length} pending messages...`);
  while (pendingWhatsAppMessages.length > 0 && clientReady) {
    const message = pendingWhatsAppMessages.shift();
    try {
      await sendMessageInternal(message);
    } catch (err) {
      console.error('[WhatsApp] Failed to flush queued message:', err);
      pendingWhatsAppMessages.unshift(message);
      break;
    }
  }
};

const MAX_SEND_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

const sendMessageInternal = async ({ to, body }, retryCount = 0) => {
  const toAddress = to.endsWith('@c.us') ? to : getWhatsAppId(to);
  if (!client || !clientReady) throw new Error('WhatsApp client not ready');

  // Validate phone number format
  const normalized = normalizePhone(to);
  if (!normalized || normalized.length < 10) {
    throw new Error('Invalid phone number format. Use international format like +91XXXXXXXXXX');
  }

  try {
    const result = await client.sendMessage(toAddress, body);
    console.log(`[WhatsApp] Message sent to ${toAddress}: ${body.substring(0, 50)}...`);
    return result;
  } catch (err) {
    const errorMsg = err.message || '';
    if (errorMsg.includes('No LID for user') || errorMsg.includes('chat not found')) {
      throw new Error('Recipient does not have WhatsApp or is not in your contacts. WhatsApp messages can only be sent to users who have WhatsApp and are in your contact list.');
    }
    if (errorMsg.includes('Execution context was destroyed') ||
        errorMsg.includes('context') ||
        errorMsg.includes('Target closed')) {
      if (retryCount < MAX_SEND_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        console.warn(`[WhatsApp] Retrying in ${delay}ms (${retryCount + 1}/${MAX_SEND_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendMessageInternal({ to, body }, retryCount + 1);
      }
    }
    console.error(`[WhatsApp] Failed to send to ${toAddress}:`, err.message);
    throw err;
  }
};

const sendMessage = async ({ to, body }) => {
  if (!clientReady) {
    console.log('[WhatsApp] Client not ready, queuing message for:', to);
    pendingWhatsAppMessages.push({ to, body });
    return { queued: true };
  }
  return sendMessageInternal({ to, body });
};

const saveMedia = async (msg, phone) => {
  try {
    await ensureUploadDir();
    const media = await msg.downloadMedia();
    if (!media || !media.data) throw new Error('No media data');
    const extension = media.mimetype?.includes('png') ? 'png' : 'jpg';
    const timestamp = Date.now();
    const sanitizedPhone = phone.replace(/^\+/, '');
    const fileName = `${sanitizedPhone}-${timestamp}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, Buffer.from(media.data, 'base64'));
    console.log(`[WhatsApp] Saved media to: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error(`[WhatsApp] Failed to save media for ${phone}:`, err);
    throw err;
  }
};

const getOrCreateFarmer = async (phone) => {
  console.log('[WhatsApp] getOrCreateFarmer input phone:', phone, 'type:', typeof phone);
  const normalized = normalizePhone(phone);
  console.log('[WhatsApp] normalized result:', normalized);
  if (!normalized) throw new Error('Invalid phone number');
  let farmer = farmerStore.get(normalized);
  if (!farmer) {
    let dbName = null, trustScore = 0;
    if (FarmerModel) {
      try {
        const existing = await FarmerModel.findOne({ phone: normalized });
        if (existing) {
          dbName = existing.name;
          trustScore = existing.trustScore || 100;
        }
      } catch (err) { }
    }
    farmer = {
      phone: normalized,
      name: dbName,
      aadhaar: null,
      upiId: null,
      trustScore: trustScore,
      language: 'en',
      state: dbName ? 4 : -1,
      listingStep: null,
      tempListing: { images: [] },
      registeredAt: null,
      totalListings: 0,
      violations: 0
    };
    farmerStore.set(normalized, farmer);
    console.log(`[WhatsApp] Created farmer record for ${normalized}. Recognized: ${!!dbName}`);
  }
  return farmer;
};

// Main message handler with interactive buttons and lists
const handleFarmerMessage = async (msg) => {
  console.log('[WhatsApp] ===== NEW MESSAGE RECEIVED =====');
  console.log('[WhatsApp] Raw msg.from:', msg.from, 'type:', typeof msg.from);
  const phone = formatPhone(msg.from);
  console.log('[WhatsApp] Formatted phone:', phone);
  if (!phone) {
    console.log('[WhatsApp] Dropping message: invalid phone format from msg.from:', msg.from);
    return;
  }

  let farmer;
  try {
    farmer = await getOrCreateFarmer(phone);
  } catch (err) {
    console.error('[WhatsApp] Failed to get/create farmer for phone:', phone, 'Error:', err.message);
    return;
  }

  // Get contact name
  try {
    const notifyName = msg._data?.notifyName;
    if (notifyName && (!farmer.name || farmer.state === 0)) farmer.name = notifyName;
    else if (msg.getContact && (!farmer.name || farmer.state === 0)) {
      const contactPromise = msg.getContact();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
      const contact = await Promise.race([contactPromise, timeoutPromise]);
      if (contact.pushname) farmer.name = contact.pushname;
    }
  } catch (e) { }
  if (!farmer.name) farmer.name = 'Farmer';

  // ─── CHANGE 2 ──────────────────────────────────────────────────────────────
  // Normalise body from all three message types:
  //   • buttons_response → farmer tapped a button; msg.body = label, msg.selectedButtonId = id
  //   • list_response    → farmer picked a list row; msg.body = row title, msg.selectedRowId = row id
  //   • plain text       → msg.body as usual
  // We prefer msg.body (the human-readable label/title) so existing .includes()
  // checks keep working, but we also check the stable id as a fast-path.
  const rawBody =
    msg.type === 'buttons_response' ? (msg.body || msg.selectedButtonId || '') :
      msg.type === 'list_response' ? (msg.body || msg.selectedRowId || '') :
        (msg.body || '');

  const body = rawBody.trim();
  const lower = body.toLowerCase();

  // Also capture the stable id (if any) for id-first matching below
  const btnId =
    msg.type === 'buttons_response' ? (msg.selectedButtonId || '') :
      msg.type === 'list_response' ? (msg.selectedRowId || '') :
        '';

  console.log(`[WhatsApp] msg.type=${msg.type} body="${body}" btnId="${btnId}"`);

  // Global cancel
  if (lower === '0' && farmer && (farmer.state > 4 || farmer.listingStep)) {
    farmer.state = 4;
    farmer.listingStep = null;
    farmer.tempListing = { images: [] };
    await msg.reply(t('cancel_back', farmer.language) + '\n\n' + t('menu', farmer.language, { name: farmer.name }));
    return;
  }

  // sendReply - simplified version using ONLY msg.reply() to avoid No LID errors
  const sendReply = async (content, buttons = null, sections = null) => {
    try {
      if (!msg || !msg.reply) {
        console.error('[WhatsApp] sendReply: No message context available');
        return;
      }

      // Format content with buttons/sections as text
      let formattedContent = content || 'Please choose an option below:';
      
      // Add sections as formatted list
      if (sections && Array.isArray(sections) && sections.length > 0) {
        let idx = 1;
        for (const section of sections) {
          formattedContent += `\n\n*${section.title}:*`;
          for (const row of section.rows) {
            formattedContent += `\n${idx}️⃣ *${row.title}*${row.description ? ` - ${row.description}` : ''}`;
            idx++;
          }
        }
      } 
      // Add buttons as numbered list
      else if (buttons && Array.isArray(buttons) && buttons.length > 0) {
        formattedContent += '\n';
        buttons.forEach((btn, idx) => {
          const label = typeof btn === 'string' ? btn : btn.label;
          formattedContent += `\n${idx + 1}️⃣ ${label}`;
        });
      }

      // Send via msg.reply() - maintains proper session context
      await msg.reply(formattedContent);
    } catch (err) {
      console.error('[WhatsApp] sendReply error:', err.message);
      // Silent fail - don't crash the bot
    }
  };

  const transitionState = (nextState) => {
    console.log(`[WhatsApp] ${phone} state: ${farmer.state} -> ${nextState}`);
    farmer.state = nextState;
  };

  // Handle greetings and common commands
  if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower === 'menu' || lower === 'start' || lower === 'help') {
    console.log(`[WhatsApp] Greeting/command detected: "${lower}", transitioning to menu`);
    if (farmer.state !== 4) {
      transitionState(4);
    }
    const sections = farmer.language === 'kn'
      ? [{
          title: 'ಮುಖ್ಯ ಮೆನುವು',
          rows: [
            { id: 'menu_create', title: '➕ ಹೊಸ ಪಟ್ಟಿ ರಚಿಸು', description: 'ನಿಮ್ಮ ಉತ್ಪನ್ನ ಪಟ್ಟಿ ಮಾಡಿ' },
            { id: 'menu_listings', title: '📋 ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ', description: 'ನಿಮ್ಮ ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು' },
            { id: 'menu_trust', title: '📊 ವಿಶ್ವಾಸ ಅಂಕೆ', description: 'ನಿಮ್ಮ ರೇಟಿಂಗ ನೋಡಿ' },
            { id: 'menu_lang', title: '🌐 ಭಾಷೆ ಬದಲಾಯಿಸು', description: 'ಆಯ್ಕೆ ಮಾಡಿ' }
          ]
        }]
      : [{
          title: 'Main Menu',
          rows: [
            { id: 'menu_create', title: '➕ Create New Listing', description: 'List your produce' },
            { id: 'menu_listings', title: '📋 View Listings', description: 'Your active listings' },
            { id: 'menu_trust', title: '📊 Trust Score', description: 'See your rating' },
            { id: 'menu_lang', title: '🌐 Change Language', description: 'Select language' }
          ]
        }];
    const menuText = farmer.language === 'kn'
      ? `🏠 ${farmer.name}, ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`
      : `🏠 ${farmer.name}, what would you like to do?`;
    await sendReply(menuText, null, sections);
    return;
  }

  // Language Selection (state -1)
  if (farmer.state === -1) {
    if (btnId === 'lang_en' || lower === '1' || lower.includes('english') || lower.includes('en')) {
      farmer.language = 'en';
      transitionState(4);
      const buttons = [
        { id: 'menu_create', label: '➕ Create New Listing' },
        { id: 'menu_listings', label: '📋 View Listings' },
        { id: 'menu_trust', label: '📊 Trust Score' }
      ];
      await sendReply(`Welcome to FarmBid, ${farmer.name}!`, buttons);
    } else if (btnId === 'lang_kn' || lower === '2' || lower.includes('kannada') || lower.includes('ಕನ್ನಡ') || lower.includes('kn')) {
      farmer.language = 'kn';
      transitionState(4);
      const buttons = [
        { id: 'menu_create', label: '➕ ಹೊಸ ಪಟ್ಟಿ' },
        { id: 'menu_listings', label: '📋 ಪಟ್ಟಿಗಳು' },
        { id: 'menu_trust', label: '📊 ವಿಶ್ವಾಸ' }
      ];
      await sendReply(`FarmBid ಗೆ ಸ್ವಾಗತ, ${farmer.name}!`, buttons);
    } else {
      const buttons = farmer.language === 'kn'
        ? [
            { id: 'lang_en', label: '🇬🇧 English' },
            { id: 'lang_kn', label: 'ಕನ್ನಡ' }
          ]
        : [
            { id: 'lang_en', label: '🇬🇧 English' },
            { id: 'lang_kn', label: 'ಕನ್ನಡ (Kannada)' }
          ];
      await sendReply('Select Language / ಭಾಷೆಯನ್ನು ಆರಿಸಿ:', buttons);
    }
    return;
  }

  // ─── CHANGE 4 ──────────────────────────────────────────────────────────────
  // State 0: Farmer confirmation
  // Matches on stable id (farmer_yes / farmer_no) first, then plain-text fallbacks
  if (farmer.state === 0) {
    if (
      btnId === 'farmer_yes' ||
      lower === 'yes' || lower === 'y' ||
      lower.includes('yes, i am a farmer') ||
      lower.includes('ಹೌದು')
    ) {
      transitionState(3);
      farmer.listingStep = null;
      const upiPrompt = farmer.language === 'kn'
        ? `ಧನ್ಯವಾದಗಳು, ${farmer.name}! ಹಣ ಪಾವತಿಗಾಗಿ ನಿಮ್ಮ UPI ID ಸೇರಿಸಲು ಏನು ಮಾಡಬೇಕು?`
        : `Thank you, ${farmer.name}! Would you like to enter your UPI ID for payments now?`;
      const upiButtons = farmer.language === 'kn'
        ? [
            { id: 'upi_enter', label: '📝 UPI ID ಸೇರಿಸು' },
            { id: 'upi_skip', label: '⏭️ ಈ ಕ್ಷಣವು ಬಿಟ್ಟುಬಿಡಿ' }
          ]
        : [
            { id: 'upi_enter', label: '📝 Enter UPI ID' },
            { id: 'upi_skip', label: '⏭️ Skip for now' }
          ];
      await sendReply(upiPrompt, upiButtons);
      return;
    } else if (
      btnId === 'farmer_no' ||
      lower === 'no' || lower === 'n' ||
      lower.includes('buyer') ||
      lower.includes('ಖರೀದಿದಾರ')
    ) {
      await sendReply(farmer.language === 'kn'
        ? `ಕ್ಷಮಿಸಿ, ಖರೀದಿದಾರರಿಗೆ ಈ ಸೇವೆ ಇಲ್ಲ. ದಯವಿಟ್ಟು ನಮ್ಮ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸಿ.`
        : `Sorry, this service is for farmers only. Please use the FarmBid buyer app.`);
      return;
    } else {
      // Re-ask with buttons
      const farmerPrompt = farmer.language === 'kn'
        ? `ಫಾರ್ಮ್ ಬಿಡ್ ಗೆ ಸ್ವಾಗತ, ${farmer.name}! ನೀವು ರೈತರೇ?`
        : `Welcome to FARM BID, ${farmer.name}! Are you a farmer?`;
      const farmerButtons = farmer.language === 'kn'
        ? [
            { id: 'farmer_yes', label: '✅ ಹೌದು, ನಾನು ರೈತ' },
            { id: 'farmer_no', label: '❌ ಇಲ್ಲ, ನಾನು ಖರೀದಿದಾರ' }
          ]
        : [
            { id: 'farmer_yes', label: '✅ Yes, I am a farmer' },
            { id: 'farmer_no', label: '❌ No, I\'m a buyer' }
          ];
      await sendReply(farmerPrompt, farmerButtons);
      return;
    }
  }

  // ─── CHANGE 5 ──────────────────────────────────────────────────────────────
  // State 3: UPI collection
  // upi_skip id matches the Skip button; upi_enter just falls through to UPI validation
  if (farmer.state === 3) {
    const isSkip = btnId === 'upi_skip' || lower.includes('skip') || lower.includes('⏭️');
    if (isSkip || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(body)) {
      if (!isSkip) {
        const result = await verifyUPI(body);
        if (result.success) farmer.upiId = body;
        else {
          await sendReply(t('upi_fail', farmer.language));
          return;
        }
      }
      farmer.trustScore = 100;
      farmer.registeredAt = new Date();
      farmer.totalListings = farmer.totalListings || 0;
      farmer.violations = farmer.violations || 0;
      transitionState(4);
      farmer.listingStep = null;
      farmer.tempListing.images = [];
      await sendReply(t('reg_complete', farmer.language, { name: farmer.name }));
      setTimeout(async () => {
        const sections = farmer.language === 'kn'
          ? [{
              title: 'ಮುಖ್ಯ ಮೆನುವು',
              rows: [
                { id: 'menu_create', title: '➕ ಹೊಸ ಪಟ್ಟಿ', description: 'ಪಟ್ಟಿ ರಚಿಸಿ' },
                { id: 'menu_listings', title: '📋 ಪಟ್ಟಿಗಳು', description: 'ನಿಮ್ಮ ಪಟ್ಟಿ' },
                { id: 'menu_trust', title: '📊 ವಿಶ್ವಾಸ', description: 'ರೇಟಿಂಗ' },
                { id: 'menu_lang', title: '🌐 ಭಾಷೆ', description: 'ಪರಿವರ್ತಿಸು' }
              ]
            }]
          : [{
              title: 'Main Menu',
              rows: [
                { id: 'menu_create', title: '➕ Create List', description: 'Start listing' },
                { id: 'menu_listings', title: '📋 My Listings', description: 'View yours' },
                { id: 'menu_trust', title: '📊 Trust Score', description: 'Your rating' },
                { id: 'menu_lang', title: '🌐 Language', description: 'Change it' }
              ]
            }];
        await sendReply(`🏠 ${farmer.name}`, null, sections);
      }, 1000);
      return;
    } else {
      await sendReply(t('invalid_upi', farmer.language));
      return;
    }
  }

  // ─── CHANGE 6 ──────────────────────────────────────────────────────────────
  // State 4: Main Menu
  // All buttons carry stable ids (menu_create, menu_listings, menu_trust, menu_lang)
  if (farmer.state === 4) {
    if (btnId === 'menu_create' || lower === '1' || lower.includes('create') || msg.hasMedia) {
      transitionState(5);
      farmer.listingStep = 'awaiting_photo';
      farmer.tempListing = { images: [] };
      if (msg.hasMedia) {
        try {
          const photoPath = await saveMedia(msg, phone);
          farmer.tempListing.images.push(photoPath);
          await sendReply(t('listing_started', farmer.language) + '\n\n' + t('step_produce', farmer.language));
          farmer.listingStep = 'awaiting_produce_name';
        } catch (err) {
          await sendReply('❌ Error saving photo.');
          transitionState(4);
        }
      } else {
        await sendReply(t('step_photo', farmer.language));
      }
      return;
    }
    if (btnId === 'menu_listings' || lower === '2' || lower.includes('view active listings') || lower.includes('my listings')) {
      const activeListings = Array.from(listingStore.values()).filter(l => l.farmerPhone === phone && l.status === 'active');
      if (activeListings.length === 0) await sendReply(t('no_active', farmer.language));
      else {
        const summary = activeListings.map(l => `🆔 *${l.listingId}*\n📦 ${l.produce}\n⚖️ ${l.quantity}kg\n💰 ₹${l.minPricePerKg}/kg`).join('\n\n---\n\n');
        await sendReply(`📋 *${farmer.language === 'kn' ? 'ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು' : 'Active Listings'}*\n\n${summary}`);
      }
      setTimeout(async () => {
        const sections = farmer.language === 'kn'
          ? [{
              title: 'ಮುಖ್ಯ ಮೆನುವು',
              rows: [
                { id: 'menu_create', title: '➕ ಹೊಸ ಪಟ್ಟಿ', description: 'ಪಟ್ಟಿ ರಚಿಸಿ' },
                { id: 'menu_listings', title: '📋 ಪಟ್ಟಿಗಳವವು', description: 'ನಿಮ್ಮ ಪಟ್ಟಿ' },
                { id: 'menu_trust', title: '📊 ವಿಶ್ವಾಸ', description: 'ರೇಟಿಂಗ' },
                { id: 'menu_lang', title: '🌐 ಭಾಷೆ', description: 'ಪರಿವರ್ತಿಸು' }
              ]
            }]
          : [{
              title: 'Main Menu',
              rows: [
                { id: 'menu_create', title: '➕ Create New', description: 'List produce' },
                { id: 'menu_listings', title: '📋 My Listings', description: 'Active listings' },
                { id: 'menu_trust', title: '📊 Trust Score', description: 'Your rating' },
                { id: 'menu_lang', title: '🌐 Change Language', description: 'Select language' }
              ]
            }];
        await sendReply(`🏠 What next, ${farmer.name}?`, null, sections);
      }, 1000);
      return;
    }
    if (btnId === 'menu_trust' || lower === '3' || lower.includes('trust score')) {
      await sendReply(t('trust_score', farmer.language, { score: farmer.trustScore }));
      setTimeout(async () => {
        const sections = farmer.language === 'kn'
          ? [{
              title: 'ಮುಖ್ಯ ಮೆನುವು',
              rows: [
                { id: 'menu_create', title: '➕ ಹೊಸ ಪಟ್ಟಿ', description: 'ಪಟ್ಟಿ ರಚಿಸಿ' },
                { id: 'menu_listings', title: '📋 ಪಟ್ಟಿಗಳು', description: 'ನಿಮ್ಮ ಪಟ್ಟಿ' },
                { id: 'menu_trust', title: '📊 ವಿಶ್ವಾಸ', description: 'ರೇಟಿಂಗ' },
                { id: 'menu_lang', title: '🌐 ಭಾಷೆ', description: 'ಪರಿವರ್ತಿಸು' }
              ]
            }]
          : [{
              title: 'Main Menu',
              rows: [
                { id: 'menu_create', title: '➕ Create New', description: 'List produce' },
                { id: 'menu_listings', title: '📋 My Listings', description: 'Your listings' },
                { id: 'menu_trust', title: '📊 Trust Score', description: 'Your rating' },
                { id: 'menu_lang', title: '🌐 Change Language', description: 'Select language' }
              ]
            }];
        await sendReply(`🏠 What next, ${farmer.name}?`, null, sections);
      }, 500);
      return;
    }
    if (btnId === 'menu_lang' || lower === '4' || lower.includes('language') || lower.includes('ಭಾಷೆ')) {
      transitionState(-1);
      const langButtons = farmer.language === 'kn'
        ? [
            { id: 'lang_en', label: '🇬🇧 English' },
            { id: 'lang_kn', label: 'ಕನ್ನಡ' }
          ]
        : [
            { id: 'lang_en', label: '🇬🇧 English' },
            { id: 'lang_kn', label: 'ಕನ್ನಡ (Kannada)' }
          ];
      await sendReply('Select Language / ಭಾಷೆಯನ್ನು ಆರಿಸಿ:', langButtons);
      return;
    }
    // Default: show menu with list
    const sections = farmer.language === 'kn'
      ? [{
          title: 'ಮುಖ್ಯ ಮೆನುವು',
          rows: [
            { id: 'menu_create', title: '➕ ಹೊಸ ಪಟ್ಟಿ ರಚಿಸು', description: 'ನಿಮ್ಮ ಪಟ್ಟಿ ರಚಿಸಿ' },
            { id: 'menu_listings', title: '📋 ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ', description: 'ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು' },
            { id: 'menu_trust', title: '📊 ವಿಶ್ವಾಸ ಅಂಕೆ', description: 'ರೇಟಿಂಗ' },
            { id: 'menu_lang', title: '🌐 ಭಾಷೆ ಬದಲಾಯಿಸು', description: 'ಆಯ್ಕೆ ಮಾಡಿ' }
          ]
        }]
      : [{
          title: 'Main Menu',
          rows: [
            { id: 'menu_create', title: '➕ Create New Listing', description: 'Start listing produce' },
            { id: 'menu_listings', title: '📋 View Listings', description: 'See your active listings' },
            { id: 'menu_trust', title: '📊 Trust Score', description: 'Check your rating' },
            { id: 'menu_lang', title: '🌐 Change Language', description: 'Select another language' }
          ]
        }];
    const menuText = farmer.language === 'kn'
      ? `🏠 ${farmer.name}, ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`
      : `🏠 ${farmer.name}, what would you like to do?`;
    await sendReply(menuText, null, sections);
    return;
  }

  // State 5: Listing Creation
  if (farmer.state === 5) {
    const step = farmer.listingStep;

    if (step === 'awaiting_photo') {
      if (msg.hasMedia) {
        try {
   const photoPath = await saveMedia(msg, phone);
          farmer.tempListing.images.push(photoPath);
          const photoMessage = `✅ Photo received! (${farmer.tempListing.images.length} image saved).\n\nYou can send more photos. When ready, pick your produce type:`;
          const produceSections = [{
            title: 'Select Produce Type',
            rows: [
              { id: 'prod_tomato', title: '🍅 Tomatoes', description: 'Fresh tomatoes' },
              { id: 'prod_onion', title: '🧅 Onions', description: 'Red/white onions' },
              { id: 'prod_potato', title: '🥔 Potatoes', description: 'Fresh potatoes' },
              { id: 'prod_chili', title: '🌶️ Green Chilies', description: 'Spicy chilies' },
              { id: 'prod_grapes', title: '🍇 Grapes', description: 'Fresh grapes' },
              { id: 'prod_other', title: '✏️ Type Another', description: 'Manual entry' }
            ]
          }];
          await sendReply(photoMessage, null, produceSections);
          farmer.listingStep = 'awaiting_produce_name';
        } catch (err) {
          await sendReply('❌ Could not save photo. Please send again.');
        }
      } else {
        await sendReply('⚠️ Please send a clear photo of your produce.');
      }
      return;
    }

    if (step === 'awaiting_produce_name') {
      if (msg.hasMedia) {
        try {
          const photoPath = await saveMedia(msg, phone);
          farmer.tempListing.images.push(photoPath);
          await sendReply(t('extra_photo', farmer.language, { count: farmer.tempListing.images.length }));
          const produceSections = [{
            title: 'Select Produce Type',
            rows: [
              { id: 'prod_tomato', title: '🍅 Tomatoes', description: '' },
              { id: 'prod_onion', title: '🧅 Onions', description: '' },
              { id: 'prod_potato', title: '🥔 Potatoes', description: '' },
              { id: 'prod_chili', title: '🌶️ Green Chilies', description: '' },
              { id: 'prod_grapes', title: '🍇 Grapes', description: '' },
              { id: 'prod_other', title: '✏️ Type another', description: '' }
            ]
          }];
          await sendReply('Select produce type:', null, produceSections);
          return;
        } catch (err) {
          await sendReply('❌ Could not save photo. Please send again.');
          return;
        }
      }

      // ─── CHANGE 7 ──────────────────────────────────────────────────────────
      // Match produce by stable list row id first, then by text as fallback
      const produceById = {
        'prod_tomato': 'Tomatoes',
        'prod_onion': 'Onions',
        'prod_potato': 'Potatoes',
        'prod_chili': 'Green Chilies',
        'prod_grapes': 'Grapes'
      };
      if (btnId === 'prod_other' || lower.includes('type another') || lower.includes('type')) {
        await sendReply('Please type the name of your produce (e.g., Tomatoes, Onions, Potatoes):');
        return;
      }
      if (produceById[btnId]) {
        farmer.tempListing.produce = produceById[btnId];
        await sendReply(t('step_weight', farmer.language, { prod: farmer.tempListing.produce }));
        farmer.listingStep = 'awaiting_weight';
        return;
      }
      // Text-based fallback
      const cleanText = body.replace(/[^\w\s]/gi, '').trim().toLowerCase();
      const produceMap = {
        'tomatoes': 'Tomatoes', 'onions': 'Onions', 'potatoes': 'Potatoes',
        'green chilies': 'Green Chilies', 'chilies': 'Green Chilies', 'chili': 'Green Chilies', 'grapes': 'Grapes'
      };
      const matchedProduce = Object.keys(produceMap).find(key => cleanText.includes(key));
      if (matchedProduce) {
        farmer.tempListing.produce = produceMap[matchedProduce];
        await sendReply(t('step_weight', farmer.language, { prod: farmer.tempListing.produce }));
        farmer.listingStep = 'awaiting_weight';
      } else if (body.trim().length >= 2) {
        farmer.tempListing.produce = body.trim();
        await sendReply(t('step_weight', farmer.language, { prod: farmer.tempListing.produce }));
        farmer.listingStep = 'awaiting_weight';
      } else {
        const produceSections = [{
          title: 'Select Produce Type',
          rows: [
            { id: 'prod_tomato', title: '🍅 Tomatoes', description: '' },
            { id: 'prod_onion', title: '🧅 Onions', description: '' },
            { id: 'prod_potato', title: '🥔 Potatoes', description: '' },
            { id: 'prod_chili', title: '🌶️ Green Chilies', description: '' },
            { id: 'prod_grapes', title: '🍇 Grapes', description: '' },
            { id: 'prod_other', title: '✏️ Type another', description: '' }
          ]
        }];
        await sendReply('⚠️ Please select a produce:', null, produceSections);
      }
      return;
    }

    if (step === 'awaiting_weight') {
      if (/^\d+(\.\d+)?$/.test(body)) {
        farmer.tempListing.weight = parseFloat(body);
        farmer.listingStep = 'awaiting_min_price';
        await sendReply(t('step_price', farmer.language, { kg: body }));
      } else {
        await sendReply(t('invalid_weight', farmer.language));
      }
      return;
    }

    if (step === 'awaiting_min_price') {
      if (/^\d+(\.\d+)?$/.test(body)) {
        farmer.tempListing.minPrice = parseFloat(body);
        farmer.listingStep = 'awaiting_harvest_date';
        const harvestButtons = [
          { id: 'harv_tomorrow', label: '🌱 Tomorrow' },
          { id: 'harv_3days', label: '📅 In 3 days' },
          { id: 'harv_1week', label: '📆 In 1 week' },
          { id: 'harv_2weeks', label: '📊 In 2 weeks' },
          { id: 'harv_1month', label: '🗓️ In 1 month' }
        ];
        // Use list since we have 5 options (more than 3 button limit)
        const harvestSections = [{
          title: 'When will it be ready?',
          rows: harvestButtons.map(btn => ({
            id: btn.id,
            title: btn.label,
            description: ''
          }))
        }];
        await sendReply(t('step_harvest', farmer.language), null, harvestSections);
      } else {
        await sendReply(t('invalid_price', farmer.language));
      }
      return;
    }

    // ─── CHANGE 8 ──────────────────────────────────────────────────────────
    // Harvest date: match on stable row id first, then text/number fallbacks
    if (step === 'awaiting_harvest_date') {
      let daysAhead;
      if (btnId === 'harv_tomorrow' || lower.includes('tomorrow') || lower === '1') daysAhead = 1;
      else if (btnId === 'harv_3days' || lower.includes('3 days') || lower === '2') daysAhead = 3;
      else if (btnId === 'harv_1week' || lower.includes('1 week') || lower === '3') daysAhead = 7;
      else if (btnId === 'harv_2weeks' || lower.includes('2 weeks') || lower === '4') daysAhead = 14;
      else if (btnId === 'harv_1month' || lower.includes('1 month') || lower === '5') daysAhead = 30;

      if (daysAhead) {
        const harvestDate = new Date();
        harvestDate.setDate(harvestDate.getDate() + daysAhead);
        const dd = String(harvestDate.getDate()).padStart(2, '0');
        const mm = String(harvestDate.getMonth() + 1).padStart(2, '0');
        const yyyy = harvestDate.getFullYear();
        farmer.tempListing.harvestDate = `${dd}-${mm}-${yyyy}`;
        farmer.listingStep = 'awaiting_location';
        await sendReply(t('step_location', farmer.language));
      } else {
        const harvestOptions = ['🌱 Tomorrow', '📅 In 3 days', '📆 In 1 week', '📊 In 2 weeks', '🗓️ In 1 month'];
        await sendReply('📅 When will your produce be ready?', harvestOptions);
      }
      return;
    }

    if (step === 'awaiting_location') {
      let locationData = null;
      if (msg.hasMedia && msg.mediaData?.location) {
        const loc = msg.mediaData.location;
        locationData = { latitude: loc.latitude, longitude: loc.longitude, address: `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` };
      } else if (body && body.trim().length >= 2) {
        locationData = { address: body.trim(), isManual: true };
      }
      if (locationData) {
        farmer.tempListing.location = locationData;
        farmer.listingStep = null;
        console.log('[WhatsApp] Location captured:', locationData);
        await completeListingCreation(phone, farmer);
      } else {
        await sendReply(t('invalid_location', farmer.language));
      }
      return;
    }
    await sendReply('⚠️ Please follow the prompts. Send the requested information.');
    return;
  }

  await sendReply('❓ Sorry, I did not understand that. Please reply with a valid option.');
  console.log(`[WhatsApp] ===== MESSAGE PROCESSING END - Unrecognized command =====`);
};

const completeListingCreation = async (phone, farmer) => {
  const location = farmer.tempListing.location || { address: 'Unknown location' };
  const payload = {
    phone,
    images: farmer.tempListing.images,
    weight: farmer.tempListing.weight,
    minPrice: farmer.tempListing.minPrice,
    harvestDate: farmer.tempListing.harvestDate,
    trustScore: farmer.trustScore,
    location: location.address || 'Unknown location',
    latitude: location.latitude,
    longitude: location.longitude
  };

  try {
    const listingResult = await createListing(payload);
    console.log('[WhatsApp] Listing created:', listingResult);
    const modelsAvailable = Listing && FarmerModel;
    if (modelsAvailable) {
      let dbFarmer = await FarmerModel.findOne({ phone });
      if (!dbFarmer) {
        const phoneDigits = phone.replace(/[^0-9]/g, '');
        dbFarmer = await FarmerModel.create({
          code: `WAPP-${phoneDigits.slice(-10)}`,
          name: farmer.name || 'WhatsApp Farmer',
          phone,
          village: 'Unknown',
          district: 'Unknown',
          pincode: '000000',
          landSize: 'Unknown',
          trustScore: farmer.trustScore,
          totalListings: 0,
          successfulSales: 0,
          joinedDate: new Date().toISOString(),
          aadhaarVerified: true,
          upiVerified: true,
          landVerified: false,
          language: farmer.language === 'kn' ? 'Kannada' : 'English',
          crops: [],
          profileImage: ''
        });
      }
      const dbListing = new Listing({
        farmerId: dbFarmer._id,
        farmerCode: dbFarmer.code,
        farmerName: farmer.name || dbFarmer.name,
        farmerTrustScore: farmer.trustScore,
        produce: farmer.tempListing.produce || 'Farm Produce',
        produceIcon: '🌾',
        quantity: farmer.tempListing.weight,
        unit: 'kg',
        minPricePerKg: farmer.tempListing.minPrice,
        currentBidPerKg: farmer.tempListing.minPrice,
        totalBids: 0,
        harvestDate: farmer.tempListing.harvestDate,
        expiryDate: farmer.tempListing.harvestDate,
        auctionEndsAt: new Date(listingResult.auctionClosesAt),
        qualityIndex: listingResult.qualityIndex || 85,
        qualityGrade: 'Standard',
        freshness: 85,
        surfaceDamage: 10,
        colorUniformity: 85,
        status: 'live',
        location: payload.location,
        pincode: '000000',
        images: farmer.tempListing.images,
        blockchainHash: `0x${crypto.randomBytes(20).toString('hex')}`
      });
      await dbListing.save();
      dbFarmer.totalListings = (dbFarmer.totalListings || 0) + 1;
      await dbFarmer.save();
      console.log('[WhatsApp] Listing saved to MongoDB:', dbListing._id);
    }

    const newListing = {
      id: listingResult.listingId || `l-${Date.now()}`,
      listingId: listingResult.listingId || `l-${Date.now()}`,
      farmerPhone: phone,
      farmerName: farmer.name || 'WhatsApp Farmer',
      farmerTrustScore: farmer.trustScore,
      produce: farmer.tempListing.produce || 'Farm Produce',
      produceIcon: '🌾',
      images: farmer.tempListing.images,
      quantity: farmer.tempListing.weight,
      unit: 'kg',
      minPricePerKg: farmer.tempListing.minPrice,
      currentBidPerKg: farmer.tempListing.minPrice,
      totalBids: 0,
      harvestDate: farmer.tempListing.harvestDate,
      qualityIndex: listingResult.qualityIndex || 85,
      qualityGrade: 'Standard',
      status: 'active',
      location: payload.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
      auctionClosesAt: listingResult.auctionClosesAt,
      createdAt: new Date().toISOString()
    };
    listingStore.set(newListing.listingId, newListing);
    farmer.totalListings += 1;
    farmer.state = 4;
    farmer.listingStep = null;
    farmer.tempListing = { images: [] };
    await sendMessage({
      to: phone, body: t('listing_live', farmer.language, {
        id: newListing.listingId,
        name: newListing.produce,
        qty: newListing.quantity,
        price: newListing.minPricePerKg
      })
    });
    setTimeout(async () => {
      const menuReply = farmer.language === 'kn'
        ? `ನಿಮ್ಮ ಪಟ್ಟಿ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ!\n\nನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`
        : `Your listing is live! 🎉\n\nWhat would you like to do next?`;
      await sendMessage({ to: phone, body: menuReply });
      await sendMessage({ to: phone, body: t('menu', farmer.language, { name: farmer.name }) });
    }, 2000);
  } catch (err) {
    console.error('[WhatsApp] Failed to create listing:', err);
    farmer.state = 4;
    farmer.listingStep = null;
    farmer.tempListing = { images: [] };
    await sendMessage({ to: phone, body: '❌ Sorry, there was an error creating your listing. Please try again later.' });
  }
};

// Notification functions
const notifyFarmerNewBid = async (farmerPhone, bidAmount, quantity, buyerCity) => {
  const farmer = farmerStore.get(farmerPhone) || { language: 'en' };
  const message = t('notify_bid', farmer.language, { amt: bidAmount, qty: quantity, city: buyerCity });
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerDealLocked = async (farmerPhone, listingId, buyerDetails) => {
  const farmer = farmerStore.get(farmerPhone) || { language: 'en' };
  const message = t('notify_locked', farmer.language, { id: listingId });
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerPaymentSent = async (farmerPhone, amount, upiId) => {
  const farmer = farmerStore.get(farmerPhone) || { language: 'en' };
  const message = t('notify_payment', farmer.language, { amt: amount });
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerDispute = async (farmerPhone, listingId, reason) => {
  const farmer = farmerStore.get(farmerPhone) || { language: 'en' };
  const message = t('notify_dispute', farmer.language, { id: listingId, reason });
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerListingExpired = async (farmerPhone, listingId) => {
  const farmer = farmerStore.get(farmerPhone) || { language: 'en' };
  const message = t('notify_expired', farmer.language, { id: listingId });
  return sendMessage({ to: farmerPhone, body: message });
};

// Startup
ensureUploadDir().then(() => console.log('[WhatsApp] Upload directory ready:', uploadDir)).catch(console.error);
(async () => {
  try {
    await initClient();
  } catch (err) {
    console.error('[WhatsApp] ⚠️ WhatsApp initialization failed:', err.message);
  }
})();

module.exports = {
  sendWhatsAppMessage: sendMessage,
  sendInteractiveButtons,
  sendListMessage,
  isReady: () => clientReady,
  getQrCode: () => lastQr,
  getAuthFailure: () => lastAuthFailure,
  notifyFarmerNewBid,
  notifyFarmerDealLocked,
  notifyFarmerPaymentSent,
  notifyFarmerDispute,
  notifyFarmerListingExpired,
  farmerStore,
  listingStore
};