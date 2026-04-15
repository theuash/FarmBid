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
// ========== CONVERSATION STATE MANAGEMENT ==========
const conversationStates = new Map(); // phone -> { step, data }

// ========== CHATBOT RESPONSE FUNCTIONS ==========
const sendButtonMessage = async (to, body, buttons) => {
  if (!clientReady || !client) return;
  try {
    // WhatsApp Web.js button format
    const buttonMessage = {
      body: body,
      buttons: buttons.map(btn => ({
        id: btn.id,
        body: btn.title
      }))
    };
    await client.sendMessage(getWhatsAppId(to), buttonMessage);
  } catch (error) {
    console.error('[WhatsApp] Button message failed:', error);
    // Fallback to text message
    await sendTextMessage(to, `${body}\n\n${buttons.map(btn => `• ${btn.title}`).join('\n')}`);
  }
};

const sendListMessage = async (to, body, sections) => {
  if (!clientReady || !client) return;
  try {
    // WhatsApp Web.js list format
    const listMessage = {
      body: body,
      buttonText: 'View Options',
      sections: sections
    };
    await client.sendMessage(getWhatsAppId(to), listMessage);
  } catch (error) {
    console.error('[WhatsApp] List message failed:', error);
    // Fallback to text message
    await sendTextMessage(to, `${body}\n\nOptions:\n${sections.map(s => s.rows.map(r => `• ${r.title}`).join('\n')).join('\n')}`);
  }
};

const sendTextMessage = async (to, body) => {
  if (!clientReady || !client) return;
  try {
    await client.sendMessage(getWhatsAppId(to), body);
  } catch (error) {
    console.error('[WhatsApp] Text message failed:', error);
  }
};

// ========== CHATBOT LOGIC ==========
const handleChatbotMessage = async (msg) => {
  const phone = formatPhone(msg.from);
  if (!phone) return;

  const userInput = msg.body?.trim() || '';
  let userState = conversationStates.get(phone);

  // Initialize state for new users
  if (!userState) {
    userState = { step: 'welcome', data: {} };
    conversationStates.set(phone, userState);

    // Send welcome message for new users
    const welcomeResponse = {
      type: 'button',
      body: '🌾 Welcome to FarmBid! Your agricultural marketplace on WhatsApp.\n\nHow can I help you today?',
      buttons: [
        { id: 'btn_create_listing', title: 'Create Listing' },
        { id: 'btn_browse_listings', title: 'Browse Listings' },
        { id: 'btn_my_listings', title: 'My Listings' }
      ]
    };

    if (welcomeResponse.type === 'button') {
      await sendButtonMessage(phone, welcomeResponse.body, welcomeResponse.buttons);
    }
    return;
  }

  let response;

  // Handle button/list selections
  if (userInput.startsWith('btn_') || userInput.startsWith('list_')) {
    response = handleButtonSelection(phone, userInput, userState);
  } else {
    // Handle text input based on current step
    response = handleTextInput(phone, userInput, userState);
  }

  if (response) {
    // Send the response based on type
    if (response.type === 'button') {
      await sendButtonMessage(phone, response.body, response.buttons);
    } else if (response.type === 'list') {
      await sendListMessage(phone, response.body, response.sections);
    } else if (response.type === 'text') {
      await sendTextMessage(phone, response.body);
    }
  }
};

const handleButtonSelection = (phone, buttonId, userState) => {
  const { step, data } = userState;

  switch (step) {
    case 'welcome':
      if (buttonId === 'btn_create_listing') {
        conversationStates.set(phone, { step: 'select_role', data: {} });
        return {
          type: 'button',
          body: 'Are you a farmer or buyer?',
          buttons: [
            { id: 'btn_farmer', title: 'Farmer' },
            { id: 'btn_buyer', title: 'Buyer' }
          ]
        };
      } else if (buttonId === 'btn_browse_listings') {
        return handleBrowseListings(phone);
      } else if (buttonId === 'btn_my_listings') {
        return handleMyListings(phone);
      }
      break;

    case 'select_role':
      if (buttonId === 'btn_farmer') {
        conversationStates.set(phone, { step: 'farmer_menu', data: { role: 'farmer' } });
        return {
          type: 'button',
          body: 'Welcome farmer! What would you like to do?',
          buttons: [
            { id: 'btn_new_listing', title: 'Create Listing' },
            { id: 'btn_view_listings', title: 'My Listings' },
            { id: 'btn_account_info', title: 'Account Info' }
          ]
        };
      } else if (buttonId === 'btn_buyer') {
        conversationStates.set(phone, { step: 'buyer_menu', data: { role: 'buyer' } });
        return {
          type: 'button',
          body: 'Welcome buyer! What would you like to do?',
          buttons: [
            { id: 'btn_browse_market', title: 'Browse Market' },
            { id: 'btn_my_bids', title: 'My Bids' },
            { id: 'btn_wallet_balance', title: 'Wallet Balance' }
          ]
        };
      }
      break;

    case 'farmer_menu':
      if (buttonId === 'btn_new_listing') {
        conversationStates.set(phone, { step: 'listing_photo', data: { ...data, listing: {} } });
        return {
          type: 'text',
          body: '📸 Please send a clear photo of your produce to start creating a listing.'
        };
      } else if (buttonId === 'btn_view_listings') {
        return handleMyListings(phone);
      } else if (buttonId === 'btn_account_info') {
        return handleAccountInfo(phone);
      }
      break;

    case 'buyer_menu':
      if (buttonId === 'btn_browse_market') {
        return handleBrowseListings(phone);
      } else if (buttonId === 'btn_my_bids') {
        return handleMyBids(phone);
      } else if (buttonId === 'btn_wallet_balance') {
        return handleWalletBalance(phone);
      }
      break;

    // Handle produce selection
    case 'select_produce':
      const produceTypes = ['tomatoes', 'potatoes', 'onions', 'carrots', 'brinjal', 'cabbage', 'other'];
      const selectedProduce = buttonId.replace('btn_', '');
      if (produceTypes.includes(selectedProduce)) {
        data.listing.produce = selectedProduce;
        conversationStates.set(phone, { step: 'enter_weight', data });
        return {
          type: 'text',
          body: `✅ ${selectedProduce.charAt(0).toUpperCase() + selectedProduce.slice(1)} selected!\n\n⚖️ Please enter the total weight in kg (e.g., 500)`
        };
      }
      break;

    // Handle listing actions
    case 'listing_actions':
      const listingId = data.currentListingId;
      if (buttonId === 'btn_view_bids') {
        return handleViewBids(phone, listingId);
      } else if (buttonId === 'btn_edit_listing') {
        return handleEditListing(phone, listingId);
      } else if (buttonId === 'btn_delete_listing') {
        return handleDeleteListing(phone, listingId);
      }
      break;
  }

  // Default fallback
  return {
    type: 'button',
    body: 'I\'m sorry, I didn\'t understand that. Let\'s start over.',
    buttons: [
      { id: 'btn_create_listing', title: 'Create Listing' },
      { id: 'btn_browse_listings', title: 'Browse Listings' },
      { id: 'btn_my_listings', title: 'My Listings' }
    ]
  };
};

const handleTextInput = (phone, text, userState) => {
  const { step, data } = userState;

  switch (step) {
    case 'enter_weight':
      const weight = parseFloat(text);
      if (isNaN(weight) || weight <= 0) {
        return {
          type: 'text',
          body: '⚠️ Please enter a valid weight in kg (numbers only, e.g., 500)'
        };
      }
      data.listing.weight = weight;
      conversationStates.set(phone, { step: 'enter_price', data });
      return {
        type: 'text',
        body: `✅ ${weight}kg noted!\n\n💰 What is your minimum price per kg? (e.g., 40)`
      };

    case 'enter_price':
      const price = parseFloat(text);
      if (isNaN(price) || price <= 0) {
        return {
          type: 'text',
          body: '⚠️ Please enter a valid price per kg (numbers only, e.g., 40)'
        };
      }
      data.listing.price = price;
      conversationStates.set(phone, { step: 'enter_location', data });
      return {
        type: 'text',
        body: `✅ ₹${price}/kg noted!\n\n📍 Please share your location or type your village/town name.`
      };

    case 'enter_location':
      data.listing.location = text;
      conversationStates.set(phone, { step: 'confirm_listing', data });
      return {
        type: 'button',
        body: `📋 Please confirm your listing:\n\n📦 Produce: ${data.listing.produce}\n⚖️ Weight: ${data.listing.weight}kg\n💰 Price: ₹${data.listing.price}/kg\n📍 Location: ${data.listing.location}`,
        buttons: [
          { id: 'btn_confirm_listing', title: 'Confirm & Publish' },
          { id: 'btn_edit_listing', title: 'Edit Details' },
          { id: 'btn_cancel_listing', title: 'Cancel' }
        ]
      };

    default:
      // Unknown step, reset to welcome
      conversationStates.set(phone, { step: 'welcome', data: {} });
      return {
        type: 'button',
        body: 'Welcome to FarmBid! How can I help you today?',
        buttons: [
          { id: 'btn_create_listing', title: 'Create Listing' },
          { id: 'btn_browse_listings', title: 'Browse Listings' },
          { id: 'btn_my_listings', title: 'My Listings' }
        ]
      };
  }
};

const handleBrowseListings = (phone) => {
  // Get active listings from database
  const listings = Array.from(listingStore.values()).filter(l => l.status === 'live').slice(0, 10);

  if (listings.length === 0) {
    return {
      type: 'button',
      body: 'No active listings available right now. Check back later!',
      buttons: [
        { id: 'btn_refresh_listings', title: 'Refresh' },
        { id: 'btn_back_to_menu', title: 'Main Menu' }
      ]
    };
  }

  const sections = [{
    title: 'Available Produce',
    rows: listings.map(listing => ({
      id: `list_listing_${listing.id}`,
      title: `${listing.produce} - ₹${listing.pricePerKg}/kg`,
      description: `${listing.weight}kg available in ${listing.location}`
    }))
  }];

  return {
    type: 'list',
    body: `Found ${listings.length} active listings. Select one to view details:`,
    button_label: 'View Listings',
    sections: sections
  };
};

const handleMyListings = (phone) => {
  const userListings = Array.from(listingStore.values()).filter(l => l.farmerPhone === phone);

  if (userListings.length === 0) {
    return {
      type: 'button',
      body: 'You don\'t have any listings yet. Would you like to create one?',
      buttons: [
        { id: 'btn_new_listing', title: 'Create Listing' },
        { id: 'btn_back_to_menu', title: 'Main Menu' }
      ]
    };
  }

  const sections = [{
    title: 'Your Listings',
    rows: userListings.map(listing => ({
      id: `list_my_listing_${listing.id}`,
      title: `${listing.produce} - ${listing.status}`,
      description: `${listing.weight}kg at ₹${listing.pricePerKg}/kg`
    }))
  }];

  return {
    type: 'list',
    body: `You have ${userListings.length} listing(s). Select one to manage:`,
    button_label: 'Manage Listings',
    sections: sections
  };
};

const handleAccountInfo = (phone) => {
  const farmer = farmerStore.get(phone);
  if (!farmer) {
    return {
      type: 'text',
      body: 'Account information not found. Please register first.'
    };
  }

  return {
    type: 'button',
    body: `📊 Account Info:\n\n👤 Name: ${farmer.name}\n📞 Phone: ${farmer.phone}\n📍 Location: ${farmer.location || 'Not set'}\n⭐ Trust Score: ${farmer.trustScore || 100}/100`,
    buttons: [
      { id: 'btn_update_profile', title: 'Update Profile' },
      { id: 'btn_back_to_menu', title: 'Main Menu' }
    ]
  };
};

const handleMyBids = (phone) => {
  // This would need to be implemented with bid data
  return {
    type: 'button',
    body: 'My Bids feature coming soon! Check back later.',
    buttons: [
      { id: 'btn_back_to_menu', title: 'Main Menu' }
    ]
  };
};

const handleWalletBalance = (phone) => {
  // This would need wallet integration
  return {
    type: 'button',
    body: 'Wallet balance: ₹0 (Demo mode)\n\nUpgrade to genuine account for real wallet!',
    buttons: [
      { id: 'btn_back_to_menu', title: 'Main Menu' }
    ]
  };
};

const handleViewBids = (phone, listingId) => {
  // Implementation for viewing bids on a listing
  return {
    type: 'text',
    body: 'View bids feature coming soon!'
  };
};

const handleEditListing = (phone, listingId) => {
  return {
    type: 'text',
    body: 'Edit listing feature coming soon!'
  };
};

const handleDeleteListing = (phone, listingId) => {
  return {
    type: 'button',
    body: 'Are you sure you want to delete this listing?',
    buttons: [
      { id: 'btn_confirm_delete', title: 'Yes, Delete' },
      { id: 'btn_cancel_delete', title: 'Cancel' }
    ]
  };
};

// ========== MAIN MESSAGE HANDLER ==========
const handleFarmerMessage = async (msg) => {
  try {
    // Handle media messages (photos for listings)
    if (msg.hasMedia) {
      await handleMediaMessage(msg);
      return;
    }

    // Handle text/button messages with chatbot logic
    await handleChatbotMessage(msg);

  } catch (error) {
    console.error('[WhatsApp] Handler crashed:', error);
    // Send error message
    const phone = formatPhone(msg.from);
    if (phone) {
      await sendTextMessage(phone, 'Sorry, something went wrong. Please try again.');
    }
  }
};

const handleMediaMessage = async (msg) => {
  const phone = formatPhone(msg.from);
  if (!phone) return;

  const userState = conversationStates.get(phone);
  if (!userState || userState.step !== 'listing_photo') {
    await sendTextMessage(phone, '📸 I\'m not expecting a photo right now. Send "menu" to see options.');
    return;
  }

  try {
    const media = await msg.downloadMedia();
    if (!media) {
      await sendTextMessage(phone, '⚠️ Could not download the photo. Please try sending it again.');
      return;
    }

    // Save photo and update listing data
    const filename = `listing_${Date.now()}_${phone}.jpg`;
    const filepath = path.join(uploadDir, filename);
    require('fs').writeFileSync(filepath, media.data, 'base64');

    userState.data.listing.photo = filename;
    conversationStates.set(phone, { step: 'select_produce', data: userState.data });

    // Send produce selection
    const produceOptions = [
      { id: 'btn_tomatoes', title: 'Tomatoes' },
      { id: 'btn_potatoes', title: 'Potatoes' },
      { id: 'btn_onions', title: 'Onions' },
      { id: 'btn_carrots', title: 'Carrots' },
      { id: 'btn_brinjal', title: 'Brinjal' },
      { id: 'btn_cabbage', title: 'Cabbage' },
      { id: 'btn_other', title: 'Other' }
    ];

    await sendButtonMessage(phone, '✅ Photo received! What type of produce is this?', produceOptions);

  } catch (error) {
    console.error('[WhatsApp] Media handling failed:', error);
    await sendTextMessage(phone, '⚠️ Failed to process the photo. Please try again.');
  }
};

// ========== STARTUP ==========
(async () => {
  await ensureUploadDir();
  loadPendingMessages();
  await initClient();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[WhatsApp] Shutting down...');
    savePendingMessages();
    if (client) {
      try { await client.destroy(); } catch (e) {}
    }
    process.exit(0);
  });
})();

// ========== EXPORTS ==========
module.exports = {
  sendWhatsAppMessage: sendMessage,
  sendInteractiveButtons: sendButtonMessage,
  sendListMessage: sendListMessage,
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
  listingStore,
  conversationStates
};