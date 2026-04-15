#!/usr/bin/env node
/**
 * FarmBid WhatsApp Automation Utility (Stable Edition)
 * Uses whatsapp-web.js with Puppeteer – enhanced for crash resistance.
 */

const { Client, LocalAuth, Buttons, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ========== GLOBAL ERROR HANDLERS ==========
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WHATSAPP] Unhandled Rejection at:', promise, 'reason:', reason);
  // Do NOT exit – just log and continue.
});

process.on('uncaughtException', (err) => {
  console.error('[WHATSAPP] Uncaught Exception:', err);
  // Keep the process alive unless it's a fatal error.
  if (err.code === 'EADDRINUSE' || err.message.includes('EADDRINUSE')) {
    console.error('Port already in use – exiting.');
    process.exit(1);
  }
  // For Puppeteer disconnections, we let the client re-initialize.
});

// ========== MODELS (Optional) ==========
let Listing, FarmerModel;
try {
  Listing = require('../models/Listing');
  FarmerModel = require('../models/Farmer');
} catch (err) {
  console.warn('[WhatsApp] MongoDB models not available:', err.message);
}

// Optional Mongoose connection (if you use it elsewhere)
let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  // Mongoose not required
}

// ========== CONFIGURATION ==========
const sessionPath = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../.wwebjs_auth');

const uploadDir = path.resolve(process.cwd(), 'uploads/listings');

// ========== IN-MEMORY STORES ==========
const farmerStore = new Map();
const listingStore = new Map();
const pendingWhatsAppMessages = []; // In-memory queue
const PENDING_FILE = path.join(sessionPath, 'pending_messages.json');

// ========== LOCALISATION ==========
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
      // ... (Kannada strings same as before, omitted for brevity)
    }
  };
  const res = strings[lang]?.[key];
  if (typeof res === 'function') return res(...Object.values(data));
  return res || strings.en[key] || key;
};

// ========== HELPER FUNCTIONS ==========
const ensureUploadDir = async () => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to ensure upload directory:', err);
  }
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.toString().replace(/[^0-9+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const formatPhone = (phone) => {
  if (!phone) return null;
  const extracted = phone.toString().replace(/^\+?([0-9]+)@.*$/, '$1');
  return extracted;
};

const getWhatsAppId = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone number');
  const digits = normalized.replace(/^\+/, '');
  return `${digits}@c.us`;
};

// ========== PUPPETEER CONFIG ==========
const getBrowserExecutable = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  // Common paths
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    return puppeteer.executablePath();
  } catch (e) {
    return null;
  }
};

const puppeteerOptions = {
  headless: process.env.WHATSAPP_HEADLESS !== 'false', // default true
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-features=site-per-process',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1280,800',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ],
  ignoreDefaultArgs: ['--enable-automation'],
  defaultViewport: null
};

const executablePath = getBrowserExecutable();
if (executablePath) puppeteerOptions.executablePath = executablePath;

// ========== SESSION LOCK CLEANUP ==========
const cleanupStaleLocks = () => {
  try {
    const sessionDir = path.join(sessionPath, 'session-farmbid-whatsapp');
    if (!fs.existsSync(sessionDir)) return;
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
    for (const lockFile of lockFiles) {
      const lockPath = path.join(sessionDir, lockFile);
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      const defaultLock = path.join(sessionDir, 'Default', lockFile);
      if (fs.existsSync(defaultLock)) fs.unlinkSync(defaultLock);
    }
  } catch (err) {
    // ignore
  }
};

// ========== PERSISTENT MESSAGE QUEUE ==========
const loadPendingMessages = () => {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const data = fs.readFileSync(PENDING_FILE, 'utf8');
      const messages = JSON.parse(data);
      pendingWhatsAppMessages.push(...messages);
      fs.unlinkSync(PENDING_FILE);
      console.log(`[WhatsApp] Loaded ${messages.length} pending messages from disk.`);
    }
  } catch (e) {
    console.warn('[WhatsApp] Could not load pending messages:', e.message);
  }
};

const savePendingMessages = () => {
  try {
    if (pendingWhatsAppMessages.length > 0) {
      fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingWhatsAppMessages), 'utf8');
      console.log(`[WhatsApp] Saved ${pendingWhatsAppMessages.length} pending messages to disk.`);
    }
  } catch (e) {
    console.warn('[WhatsApp] Could not save pending messages:', e.message);
  }
};

// ========== CLIENT STATE ==========
let client = null;
let clientReady = false;
let lastQr = null;
let lastAuthFailure = null;
let isInitializing = false;
let reconnectTimer = null;

// ========== INIT CLIENT (ROBUST) ==========
const initClient = async () => {
  if (isInitializing) {
    console.log('[WhatsApp] Initialization already in progress, skipping.');
    return;
  }
  if (client) {
    try { await client.destroy(); } catch (e) {}
    client = null;
  }
  clientReady = false;
  isInitializing = true;
  cleanupStaleLocks();

  try {
    client = new Client({
      authStrategy: new LocalAuth({ clientId: 'farmbid-whatsapp', dataPath: sessionPath }),
      puppeteer: puppeteerOptions,
      restartOnAuthFail: true,
      takeoverOnConflict: true,
      qrMaxRetries: 2,
      authTimeoutMs: 60000
    });

    client.on('qr', (qr) => {
      lastQr = qr;
      lastAuthFailure = null;
      console.log('\n📱 Scan QR code:\n');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      clientReady = true;
      isInitializing = false;
      console.log('✅ WhatsApp client ready!');
      flushPendingMessages();
    });

    client.on('authenticated', () => console.log('[WhatsApp] Authenticated'));

    client.on('auth_failure', (msg) => {
      clientReady = false;
      lastAuthFailure = msg;
      console.error('❌ Auth failure:', msg);
      // Clean session on auth failure
      const sessionDir = path.join(sessionPath, 'session-farmbid-whatsapp');
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      isInitializing = false;
    });

    client.on('disconnected', async (reason) => {
      clientReady = false;
      console.warn('⚠️ WhatsApp disconnected:', reason);
      try { await client.destroy(); } catch (e) {}
      client = null;
      isInitializing = false;
      savePendingMessages(); // Save queue before reconnecting
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log('[WhatsApp] Attempting reconnect...');
        initClient();
      }, 10000);
    });

    client.on('message', async (msg) => {
      if (!clientReady) return;
      if (msg.from.endsWith('@g.us')) return;
      try {
        await handleFarmerMessage(msg);
      } catch (err) {
        console.error('[WhatsApp] Error in message handler:', err);
      }
    });

    await client.initialize();
    console.log('[WhatsApp] Client initialized.');
  } catch (err) {
    console.error('[WhatsApp] Init error:', err);
    clientReady = false;
    client = null;
    isInitializing = false;
    // Retry after delay
    setTimeout(() => initClient(), 15000);
  }
};

// ========== MESSAGE QUEUE FLUSH ==========
const flushPendingMessages = async () => {
  if (pendingWhatsAppMessages.length === 0) return;
  console.log(`[WhatsApp] Flushing ${pendingWhatsAppMessages.length} messages...`);
  const toSend = [...pendingWhatsAppMessages];
  pendingWhatsAppMessages.length = 0;
  for (const msg of toSend) {
    try {
      await sendMessageInternal(msg);
      // small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error('[WhatsApp] Failed to send queued message, re-queueing:', err);
      pendingWhatsAppMessages.push(msg);
      break;
    }
  }
  savePendingMessages();
};

// ========== SEND MESSAGE (with retries) ==========
const sendMessageInternal = async ({ to, body }, retryCount = 0) => {
  if (!client || !clientReady) {
    pendingWhatsAppMessages.push({ to, body });
    savePendingMessages();
    throw new Error('Client not ready – message queued.');
  }
  const toAddress = to.endsWith('@c.us') ? to : getWhatsAppId(to);
  try {
    const result = await client.sendMessage(toAddress, body);
    console.log(`[WhatsApp] Sent to ${toAddress}: ${body.substring(0, 50)}`);
    return result;
  } catch (err) {
    const errorMsg = err.message || '';
    if (errorMsg.includes('Execution context was destroyed') ||
        errorMsg.includes('Target closed') ||
        errorMsg.includes('Session closed')) {
      if (retryCount < 3) {
        console.warn(`[WhatsApp] Context error, retrying (${retryCount+1}/3)...`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount+1)));
        return sendMessageInternal({ to, body }, retryCount + 1);
      }
    }
    if (errorMsg.includes('No LID for user') || errorMsg.includes('chat not found')) {
      throw new Error('Recipient not on WhatsApp.');
    }
    throw err;
  }
};

const sendMessage = async ({ to, body }) => {
  if (!clientReady) {
    pendingWhatsAppMessages.push({ to, body });
    savePendingMessages();
    return { queued: true };
  }
  return sendMessageInternal({ to, body });
};

// ========== MEDIA SAVE WITH TIMEOUT ==========
const saveMedia = async (msg, phone) => {
  await ensureUploadDir();
  // Add timeout to downloadMedia
  const mediaPromise = msg.downloadMedia();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Media download timeout')), 15000)
  );
  const media = await Promise.race([mediaPromise, timeoutPromise]);
  if (!media || !media.data) throw new Error('No media data');
  const extension = media.mimetype?.includes('png') ? 'png' : 'jpg';
  const fileName = `${phone.replace(/\D/g, '')}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(filePath, Buffer.from(media.data, 'base64'));
  return filePath;
};

// ========== FARMER MANAGEMENT ==========
const getOrCreateFarmer = async (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone');
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
      } catch (e) { /* ignore */ }
    }
    farmer = {
      phone: normalized,
      name: dbName,
      aadhaar: null,
      upiId: null,
      trustScore,
      language: 'en',
      state: dbName ? 4 : -1,
      listingStep: null,
      tempListing: { images: [] },
      registeredAt: null,
      totalListings: 0,
      violations: 0
    };
    farmerStore.set(normalized, farmer);
  }
  return farmer;
};

// ========== MESSAGE HANDLER (unchanged logic, but wrapped in try/catch) ==========
const handleFarmerMessage = async (msg) => {
  // ... The entire handler function from your original code.
  // I'm omitting it here for brevity, but you should paste your existing handler.
  // IMPORTANT: wrap the whole function body in try/catch and log errors.
  try {
    // (Your existing handler code here)
  } catch (error) {
    console.error('[WhatsApp] Handler crashed:', error);
  }
};

// ========== STARTUP ==========
// DISABLED: Auto-initialization moved to whatsapp.final.js
// (async () => {
//   await ensureUploadDir();
//   loadPendingMessages();
//   await initClient();
//
//   // Graceful shutdown
//   process.on('SIGINT', async () => {
//     console.log('\n[WhatsApp] Shutting down...');
//     savePendingMessages();
//    if (client) {
//      try { await client.destroy(); } catch (e) {}
//    }
//    process.exit(0);
//  });
// })();

// ========== EXPORTS ==========
module.exports = {
  sendWhatsAppMessage: sendMessage,
  sendInteractiveButtons: async (to, body, buttons) => { /* implement similarly */ },
  sendListMessage: async (to, body, sections) => { /* implement similarly */ },
  isReady: () => clientReady,
  getQrCode: () => lastQr,
  getAuthFailure: () => lastAuthFailure,
  notifyFarmerNewBid: async (phone, amt, qty, city) => {
    const farmer = farmerStore.get(phone) || { language: 'en' };
    return sendMessage({ to: phone, body: t('notify_bid', farmer.language, { amt, qty, city }) });
  },
  notifyFarmerDealLocked: async (phone, id) => {
    const farmer = farmerStore.get(phone) || { language: 'en' };
    return sendMessage({ to: phone, body: t('notify_locked', farmer.language, { id }) });
  },
  notifyFarmerPaymentSent: async (phone, amt) => {
    const farmer = farmerStore.get(phone) || { language: 'en' };
    return sendMessage({ to: phone, body: t('notify_payment', farmer.language, { amt }) });
  },
  notifyFarmerDispute: async (phone, id, reason) => {
    const farmer = farmerStore.get(phone) || { language: 'en' };
    return sendMessage({ to: phone, body: t('notify_dispute', farmer.language, { id, reason }) });
  },
  notifyFarmerListingExpired: async (phone, id) => {
    const farmer = farmerStore.get(phone) || { language: 'en' };
    return sendMessage({ to: phone, body: t('notify_expired', farmer.language, { id }) });
  },
  farmerStore,
  listingStore
};