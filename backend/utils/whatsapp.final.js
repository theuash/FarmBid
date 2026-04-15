'use strict';

const { Client, LocalAuth, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createListing } = require('./mockAPIs');
const interactive = require('./whatsappInteractive');

const sessionPath = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../.wwebjs_auth');
const whatsappClientId = process.env.WHATSAPP_CLIENT_ID || 'farmbid-whatsapp-v2';

const farmerStore = new Map();
const listingStore = new Map();

let client = null;
let clientReady = false;
let lastQr = null;
let lastAuthFailure = null;
let isInitializing = false;
let initRetryCount = 0;
const MAX_INIT_RETRIES = 1;

const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.toString().replace(/[^0-9+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const getWhatsAppId = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone number');
  return `${normalized.replace(/^\+/, '')}@c.us`;
};

const getIncomingText = (msg) => {
  if (!msg) return '';
  const selected = msg.selectedButtonId || msg.selectedRowId || msg.body || '';
  return selected.toString().trim();
};

const createFarmer = (phone) => ({
  phone,
  state: 'language',
  language: 'en',
  name: null,
  menuContext: 'language',
  tempListing: {}
});

const getOrCreateFarmer = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid incoming phone');
  let farmer = farmerStore.get(normalized);
  if (!farmer) {
    farmer = createFarmer(normalized);
    farmerStore.set(normalized, farmer);
  }
  return farmer;
};

const getLangText = (lang, en, kn) => (lang === 'kn' ? kn : en);

const textMainMenu = (farmer) =>
  interactive.createMainMenu(farmer.name || 'Farmer', farmer.language || 'en');

const safeSend = async (chatId, payload, fallback) => {
  if (!client || !clientReady) throw new Error('WhatsApp client not ready');
  try {
    const sent = await client.sendMessage(chatId, payload);
    console.log(`[WhatsApp] Sent interactive message to ${chatId}`);
    return sent;
  } catch (err) {
    console.warn(`[WhatsApp] Interactive send failed for ${chatId}, falling back to text.`, err.message || err);
    if (fallback) {
      const sent = await client.sendMessage(chatId, fallback);
      console.log(`[WhatsApp] Sent fallback text menu to ${chatId}`);
      return sent;
    }
    throw err;
  }
};

const sendLanguageOptions = async (chatId) => {
  const body = 'Hello there! I am your FarmBid assistant.\nPlease choose language.';
  const languageList = new List(
    body,
    'Choose language',
    [
      {
        title: 'Languages',
        rows: [
          { id: 'lang_en', title: 'English' },
          { id: 'lang_kn', title: 'ಕನ್ನಡ' }
        ]
      }
    ],
    'FarmBid',
    'Language selection'
  );
  await safeSend(chatId, languageList, interactive.createLanguageMenu());
};

const sendMainMenu = async (chatId, farmer) => {
  const isKn = farmer.language === 'kn';
  const body = isKn
    ? 'ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.'
    : 'What would you like to do? Select an option below.';

  const sections = [
    {
      title: isKn ? 'ಮುಖ್ಯ ಆಯ್ಕೆಗಳು' : 'Main options',
      rows: [
        { id: 'create_listing', title: isKn ? 'ಪಟ್ಟಿ ರಚಿಸಿ' : 'Create Listing' },
        { id: 'my_listings', title: isKn ? 'ನನ್ನ ಪಟ್ಟಿಗಳು' : 'My Listings' },
        { id: 'trust_score', title: isKn ? 'ನನ್ನ ಟ್ರಸ್ಟ್ ಸ್ಕೋರ್' : 'My Trust Score' },
        { id: 'faq', title: isKn ? 'ಸಹಾಯ ಮತ್ತು ಪ್ರಶ್ನೆಗಳು' : 'FAQ & Help' },
        { id: 'support', title: isKn ? 'ಸಹಾಯ ಸಂಪರ್ಕ' : 'Contact Support' }
      ]
    }
  ];

  const list = new List(
    body,
    isKn ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose option',
    sections,
    'FarmBid',
    isKn ? 'ಸೇವೆಗಳು' : 'Services'
  );

  await safeSend(chatId, list, textMainMenu(farmer));
};

const sendProduceMenu = async (chatId, farmer) => {
  const isKn = farmer.language === 'kn';
  const body = isKn
    ? 'ನೀವು ಯಾವ ಬೆಳೆ ಮಾರುತ್ತಿದ್ದೀರಿ?'
    : 'What produce are you selling?';

  const sections = [
    {
      title: isKn ? 'ಬೆಳೆ ಆಯ್ಕೆ' : 'Choose produce',
      rows: [
        { id: 'produce_rice', title: isKn ? 'ಅಕ್ಕಿ / ಭತ್ತ' : 'Rice / Paddy' },
        { id: 'produce_wheat', title: isKn ? 'ಗೋಧಿ' : 'Wheat' },
        { id: 'produce_corn', title: isKn ? 'ಮೆಕ್ಕೆಜೋಳ' : 'Corn / Maize' },
        { id: 'produce_ragi', title: isKn ? 'ರಾಗಿ' : 'Ragi (Millet)' },
        { id: 'produce_sugarcane', title: isKn ? 'ಕಬ್ಬು' : 'Sugarcane' },
        { id: 'produce_cotton', title: isKn ? 'ಹತ್ತಿ' : 'Cotton' },
        { id: 'produce_tomato', title: isKn ? 'ಟೊಮೆಟೊ' : 'Tomato' },
        { id: 'produce_onion', title: isKn ? 'ಈರುಳ್ಳಿ' : 'Onion' },
        { id: 'produce_other', title: isKn ? 'ಇತರೆ' : 'Other' }
      ]
    }
  ];

  const list = new List(
    body,
    isKn ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Select produce',
    sections,
    'FarmBid',
    isKn ? 'ಪಟ್ಟಿ ರಚನೆ - ಹಂತ 1' : 'Create listing - Step 1'
  );

  await safeSend(chatId, list, interactive.createProduceMenu(farmer.language));
};

const sendConfirmMenu = async (chatId, farmer) => {
  const details = farmer.language === 'kn'
    ? `ಬೆಳೆ: ${farmer.tempListing.produce}\nತೂಕ: ${farmer.tempListing.weight}kg\nಬೆಲೆ: ₹${farmer.tempListing.minPrice}/kg\nಕೊಯ್ಲು: ${farmer.tempListing.harvestDate}`
    : `Produce: ${farmer.tempListing.produce}\nWeight: ${farmer.tempListing.weight}kg\nPrice: ₹${farmer.tempListing.minPrice}/kg\nHarvest: ${farmer.tempListing.harvestDate}`;

  const confirmList = new List(
    details,
    farmer.language === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose action',
    [{
      title: farmer.language === 'kn' ? 'ದೃಢೀಕರಣ' : 'Confirmation',
      rows: [
        { id: 'confirm', title: farmer.language === 'kn' ? 'ದೃಢೀಕರಿಸಿ' : 'Confirm' },
        { id: 'cancel', title: farmer.language === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel' }
      ]
    }],
    farmer.language === 'kn' ? 'ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ' : 'Please confirm',
    farmer.language === 'kn' ? 'ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ' : 'Select one option'
  );

  await safeSend(chatId, confirmList, interactive.createConfirmMenu(details, farmer.language));
};

const handleCreateListingStart = async (chatId, farmer) => {
  farmer.state = 'listing_produce';
  farmer.menuContext = 'produce';
  farmer.tempListing = {};
  await sendProduceMenu(chatId, farmer);
};

const tryStartFlow = async (chatId, text, farmer) => {
  const t = text.toLowerCase();
  if (!t || t === 'hi' || t === 'hello' || t === 'hey' || t === 'start') {
    farmer.state = 'language';
    farmer.menuContext = 'language';
    await sendLanguageOptions(chatId);
    return true;
  }
  return false;
};

const handleFarmerMessage = async (msg) => {
  if (!msg || !msg.from || msg.from.endsWith('@g.us')) return;
  const chatId = msg.from;
  const phone = `+${chatId.split('@')[0]}`;
  const farmer = getOrCreateFarmer(phone);
  const input = getIncomingText(msg);

  if (await tryStartFlow(chatId, input, farmer)) return;

  const parsed = interactive.parseReply(input, farmer.menuContext);

  if (farmer.state === 'language') {
    if (!parsed) {
      await sendLanguageOptions(chatId);
      return;
    }
    farmer.language = parsed === 'lang_kn' ? 'kn' : 'en';
    farmer.state = 'main_menu';
    farmer.menuContext = 'main';
    await client.sendMessage(
      chatId,
      getLangText(
        farmer.language,
        'Great! Language set to English.',
        'ಚೆನ್ನಾಗಿದೆ! ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.'
      )
    );
    await sendMainMenu(chatId, farmer);
    return;
  }

  if (farmer.state === 'main_menu') {
    if (!parsed) {
      await sendMainMenu(chatId, farmer);
      return;
    }
    if (parsed === 'create_listing') {
      await handleCreateListingStart(chatId, farmer);
      return;
    }
    if (parsed === 'my_listings') {
      const mine = Array.from(listingStore.values()).filter((item) => item.farmerPhone === farmer.phone);
      if (!mine.length) {
        await client.sendMessage(chatId, getLangText(farmer.language, 'You have no active listings.', 'ನಿಮಗೆ ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳಿಲ್ಲ.'));
      } else {
        const text = mine.slice(0, 10).map((l, idx) => `${idx + 1}. ${l.produce} - ${l.quantity}kg - ₹${l.minPricePerKg}/kg`).join('\n');
        await client.sendMessage(chatId, getLangText(farmer.language, `Your active listings:\n${text}`, `ನಿಮ್ಮ ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು:\n${text}`));
      }
      await sendMainMenu(chatId, farmer);
      return;
    }
    if (parsed === 'trust_score') {
      await client.sendMessage(chatId, getLangText(farmer.language, 'Your Trust Score: 85/100', 'ನಿಮ್ಮ ಟ್ರಸ್ಟ್ ಸ್ಕೋರ್: 85/100'));
      await sendMainMenu(chatId, farmer);
      return;
    }
    if (parsed === 'faq') {
      await client.sendMessage(chatId, getLangText(farmer.language, 'FAQ:\n1) Create listing\n2) Wait for bids\n3) Confirm deal', 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು:\n1) ಪಟ್ಟಿ ರಚಿಸಿ\n2) ಬಿಡ್‌ಗಳಿಗೆ ಕಾಯಿರಿ\n3) ವ್ಯವಹಾರ ದೃಢೀಕರಿಸಿ'));
      await sendMainMenu(chatId, farmer);
      return;
    }
    await client.sendMessage(chatId, getLangText(farmer.language, 'Support: +91 90000 00000', 'ಸಹಾಯ: +91 90000 00000'));
    await sendMainMenu(chatId, farmer);
    return;
  }

  if (farmer.state === 'listing_produce') {
    const produceAction = parsed || (input ? `produce_${input.toLowerCase().replace(/\s+/g, '_')}` : null);
    if (!produceAction || !produceAction.startsWith('produce_')) {
      await sendProduceMenu(chatId, farmer);
      return;
    }
    farmer.tempListing.produce = produceAction.replace(/^produce_/, '').replace(/_/g, ' ');
    farmer.state = 'listing_weight';
    farmer.menuContext = null;
    await client.sendMessage(chatId, getLangText(farmer.language, 'Enter total quantity in kg (example: 500)', 'ಒಟ್ಟು ಪ್ರಮಾಣವನ್ನು kg ನಲ್ಲಿ ನಮೂದಿಸಿ (ಉದಾಹರಣೆ: 500)'));
    return;
  }

  if (farmer.state === 'listing_weight') {
    const weight = Number(input);
    if (!Number.isFinite(weight) || weight <= 0) {
      await client.sendMessage(chatId, getLangText(farmer.language, 'Please enter a valid weight in kg.', 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ತೂಕವನ್ನು kg ನಲ್ಲಿ ನಮೂದಿಸಿ.'));
      return;
    }
    farmer.tempListing.weight = weight;
    farmer.state = 'listing_price';
    await client.sendMessage(chatId, getLangText(farmer.language, 'Enter minimum price per kg in rupees.', 'ಪ್ರತಿ kg ಕನಿಷ್ಠ ಬೆಲೆ (ರೂಪಾಯಿ) ನಮೂದಿಸಿ.'));
    return;
  }

  if (farmer.state === 'listing_price') {
    const minPrice = Number(input);
    if (!Number.isFinite(minPrice) || minPrice <= 0) {
      await client.sendMessage(chatId, getLangText(farmer.language, 'Please enter a valid price.', 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ಬೆಲೆಯನ್ನು ನಮೂದಿಸಿ.'));
      return;
    }
    farmer.tempListing.minPrice = minPrice;
    farmer.state = 'listing_harvest';
    await client.sendMessage(chatId, getLangText(farmer.language, 'Enter harvest date (YYYY-MM-DD).', 'ಕೊಯ್ಲು ದಿನಾಂಕ (YYYY-MM-DD) ನಮೂದಿಸಿ.'));
    return;
  }

  if (farmer.state === 'listing_harvest') {
    farmer.tempListing.harvestDate = input;
    farmer.state = 'listing_confirm';
    farmer.menuContext = 'confirm';
    await sendConfirmMenu(chatId, farmer);
    return;
  }

  if (farmer.state === 'listing_confirm') {
    const action = parsed || input.toLowerCase();
    if (action !== 'confirm' && action !== 'cancel') {
      await sendConfirmMenu(chatId, farmer);
      return;
    }
    if (action === 'cancel') {
      farmer.state = 'main_menu';
      farmer.menuContext = 'main';
      farmer.tempListing = {};
      await client.sendMessage(chatId, getLangText(farmer.language, 'Listing cancelled.', 'ಪಟ್ಟಿ ರದ್ದು ಮಾಡಲಾಗಿದೆ.'));
      await sendMainMenu(chatId, farmer);
      return;
    }

    const result = await createListing({
      phone: farmer.phone,
      images: [],
      weight: farmer.tempListing.weight,
      minPrice: farmer.tempListing.minPrice,
      harvestDate: farmer.tempListing.harvestDate,
      trustScore: 85,
      location: 'Unknown'
    });

    const listingId = result.listingId || uuidv4();
    const listing = {
      id: listingId,
      listingId,
      farmerPhone: farmer.phone,
      produce: farmer.tempListing.produce,
      quantity: farmer.tempListing.weight,
      minPricePerKg: farmer.tempListing.minPrice,
      harvestDate: farmer.tempListing.harvestDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      images: result.images || []
    };
    listingStore.set(listingId, listing);

    farmer.state = 'main_menu';
    farmer.menuContext = 'main';
    farmer.tempListing = {};
    await client.sendMessage(
      chatId,
      getLangText(
        farmer.language,
        `Listing created successfully.\nID: ${listingId}\nBuyers can now place bids.`,
        `ಪಟ್ಟಿ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ.\nID: ${listingId}\nಖರೀದಿದಾರರು ಈಗ ಬಿಡ್ ಮಾಡಬಹುದು.`
      )
    );
    await sendMainMenu(chatId, farmer);
    return;
  }

  farmer.state = 'language';
  farmer.menuContext = 'language';
  await sendLanguageOptions(chatId);
};

const cleanupStaleWhatsAppLocks = () => {
  const sessionDir = path.join(sessionPath, `session-${whatsappClientId}`);
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
  if (!fs.existsSync(sessionDir)) return;

  for (const lockFile of lockFiles) {
    const lockPath = path.join(sessionDir, lockFile);
    const defaultLockPath = path.join(sessionDir, 'Default', lockFile);
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      if (fs.existsSync(defaultLockPath)) fs.unlinkSync(defaultLockPath);
    } catch (err) {
      // Continue; a stale lock may already be gone.
    }
  }
};

const initClient = async () => {
  if (isInitializing) return;
  isInitializing = true;
  try {
    fs.mkdirSync(sessionPath, { recursive: true });
    cleanupStaleWhatsAppLocks();
    console.log(`[WhatsApp] Using session client id: ${whatsappClientId}`);
    client = new Client({
      authStrategy: new LocalAuth({ clientId: whatsappClientId, dataPath: sessionPath }),
      puppeteer: {
        headless: process.env.WHATSAPP_HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      takeoverOnConflict: true
    });

    client.on('qr', (qr) => {
      lastQr = qr;
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      clientReady = true;
      console.log('[WhatsApp] Client ready.');
    });

    client.on('auth_failure', (message) => {
      clientReady = false;
      lastAuthFailure = message;
      console.error('[WhatsApp] Auth failure:', message);
    });

    client.on('disconnected', (reason) => {
      clientReady = false;
      console.warn('[WhatsApp] Disconnected:', reason);
    });

    client.on('message', async (msg) => {
      try {
        const incoming = getIncomingText(msg);
        console.log(`[WhatsApp] Incoming from ${msg.from}: ${incoming}`);
        await handleFarmerMessage(msg);
      } catch (error) {
        console.error('[WhatsApp] Message handler failed:', error);
      }
    });

    await client.initialize();
    initRetryCount = 0;
  } catch (error) {
    console.error('[WhatsApp] Init failed:', error);
    const message = String(error && error.message ? error.message : '');
    const alreadyRunningError = message.includes('browser is already running for');
    if (alreadyRunningError && initRetryCount < MAX_INIT_RETRIES) {
      initRetryCount += 1;
      console.warn('[WhatsApp] Detected locked browser profile. Cleaning stale locks and retrying...');
      cleanupStaleWhatsAppLocks();
      setTimeout(() => {
        initClient().catch(() => {});
      }, 1500);
    }
  } finally {
    isInitializing = false;
  }
};

const sendWhatsAppMessage = async ({ to, body }) => {
  if (!to || !body) throw new Error('to and body are required');
  if (!client || !clientReady) throw new Error('WhatsApp client is not ready');
  const toAddress = to.endsWith('@c.us') ? to : getWhatsAppId(to);
  return client.sendMessage(toAddress, body);
};

const sendInteractiveButtons = async (to, body, buttons) => {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    throw new Error('buttons must be a non-empty array');
  }
  const toAddress = to.endsWith('@c.us') ? to : getWhatsAppId(to);
  const payload = new Buttons(
    body,
    buttons.map((btn) => ({ id: btn.id || btn.body, body: btn.body })),
    'FarmBid',
    'Choose one option'
  );
  return safeSend(toAddress, payload, body);
};

const sendListMessage = async (to, body, sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('sections must be a non-empty array');
  }
  const toAddress = to.endsWith('@c.us') ? to : getWhatsAppId(to);
  const payload = new List(body, 'Open options', sections, 'FarmBid', 'Select an option');
  return safeSend(toAddress, payload, body);
};

const notifyFarmerNewBid = async (phone, amount, qty, city) =>
  sendWhatsAppMessage({
    to: phone,
    body: `NEW BID: ₹${amount}/kg for ${qty}kg${city ? ` from ${city}` : ''}.`
  });

const notifyFarmerDealLocked = async (phone, listingId, buyerDetails) =>
  sendWhatsAppMessage({
    to: phone,
    body: `Deal locked for listing ${listingId}.${buyerDetails ? ` Buyer: ${buyerDetails}` : ''}`
  });

const notifyFarmerPaymentSent = async (phone, amount, upiId) =>
  sendWhatsAppMessage({
    to: phone,
    body: `Payment sent: ₹${amount}${upiId ? ` to ${upiId}` : ''}.`
  });

const notifyFarmerDispute = async (phone, listingId, reason) =>
  sendWhatsAppMessage({
    to: phone,
    body: `Dispute raised for listing ${listingId}. Reason: ${reason}`
  });

const notifyFarmerListingExpired = async (phone, listingId) =>
  sendWhatsAppMessage({
    to: phone,
    body: `Listing ${listingId} has expired. Reply "hi" to create a new listing.`
  });

initClient();

module.exports = {
  sendWhatsAppMessage,
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
