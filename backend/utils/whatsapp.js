const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const {
  verifyAadhaar,
  verifyOTP,
  verifyUPI,
  createListing
} = require('./mockAPIs');

const sessionPath = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../.wwebjs_auth');

const uploadDir = path.resolve(process.cwd(), 'uploads/listings');

const farmerStore = new Map();
const listingStore = new Map();

const ensureUploadDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Failed to ensure upload directory:', err);
  }
};

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
  return phone.toString().replace(/^\+?([0-9]+)@.*$/, '$1');
};

const getWhatsAppId = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Invalid phone number for WhatsApp delivery');
  }
  return `whatsapp:${normalized}`;
};

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

const logStateTransition = (phone, from, to) => {
  console.log(`[WhatsApp] ${phone} state transition ${from} -> ${to}`);
};

const buildRegisteredMenu = (name) => {
  return `Welcome back ${name}! What would you like to do?\n1. Create new listing\n2. View my active listings\n3. View my trust score\nReply with 1, 2, or 3`;
};

const saveMedia = async (msg, phone) => {
  try {
    await ensureUploadDir();
    const media = await msg.downloadMedia();
    if (!media || !media.data) {
      throw new Error('No media data found.');
    }

    const extension = media.mimetype.includes('png') ? 'png' : 'jpg';
    const timestamp = Date.now();
    const sanitizedPhone = phone.replace(/^\+/, '');
    const fileName = `${sanitizedPhone}-${timestamp}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, Buffer.from(media.data, 'base64'));
    return filePath;
  } catch (err) {
    console.error(`[WhatsApp] failed to save media for ${phone}:`, err);
    throw err;
  }
};

const getOrCreateFarmer = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Invalid phone number.');
  }

  let farmer = farmerStore.get(normalized);
  if (!farmer) {
    farmer = {
      phone: normalized,
      name: null,
      aadhaar: null,
      upiId: null,
      trustScore: 0,
      state: 0,
      listingStep: null,
      tempListing: {},
      registeredAt: null,
      totalListings: 0,
      violations: 0
    };
    farmerStore.set(normalized, farmer);
    console.log(`[WhatsApp] created new farmer record for ${normalized}`);
  }

  return farmer;
};

const sendMessage = async ({ to, body }) => {
  if (!clientReady) {
    const error = new Error('WhatsApp client is not ready. Scan the QR code and wait until the client is authenticated.');
    error.code = 'WHATSAPP_NOT_READY';
    throw error;
  }

  const toAddress = to.startsWith('whatsapp:') ? to : getWhatsAppId(to);
  return client.sendMessage(toAddress, body);
};

const handleFarmerMessage = async (msg) => {
  let phone = formatPhone(msg.from);
  
  // If self-messaging test (message_create), msg.to is the destination
  if (msg.fromMe) {
    phone = formatPhone(msg.to);
  }
  
  if (!phone) {
    console.warn('[WhatsApp] could not parse sender phone');
    return;
  }

  const farmer = getOrCreateFarmer(phone);
  const body = msg.body?.trim() || '';
  const lower = body.toLowerCase();
  
  const sendReply = async (text) => {
    if (text) {
      // Use client.sendMessage explicitly to ensure delivery to self overrides
      const toAddress = msg.fromMe ? msg.to : msg.from;
      await client.sendMessage(toAddress, text);
    }
  };

  const transitionTo = (state) => {
    farmer.state = state;
  };

  // Namma Metro State Machine Engine
  switch (farmer.state) {
    case 0:
      // STATE 0: Asking for Language
      if (lower === '1' || lower === '2' || lower === '3' || lower.includes('hi') || lower.includes('hello')) {
        if (lower === '1') farmer.language = 'en';
        if (lower === '2') farmer.language = 'kn';
        if (lower === '3') farmer.language = 'hi';
        
        transitionTo(1);
        await sendReply("Great! Let's create a new listing. What type of crop do you want to list?\n\n*Reply with the number:*\n1️⃣ 🍅 Tomatoes\n2️⃣ 🧅 Onions\n3️⃣ 🌾 Wheat");
      } else {
        await sendReply("Welcome to FarmBid! Please select your language / ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ / कृपया अपनी भाषा चुनें\n\n*Reply with the number:*\n1️⃣ 🌐 English\n2️⃣ 🟢 ಕನ್ನಡ (Kannada)\n3️⃣ 🟠 हिंदी (Hindi)");
      }
      break;

    case 1:
      // STATE 1: Crop Selection
      if (lower === '1' || lower === '2' || lower === '3' || lower.includes('tomato') || lower.includes('onion')) {
        if (lower === '1' || lower.includes('tomato')) farmer.tempListing.produce = 'Tomatoes';
        else if (lower === '2' || lower.includes('onion')) farmer.tempListing.produce = 'Onions';
        else farmer.tempListing.produce = 'Wheat';

        farmer.tempListing.weight = 500; // default for demo
        transitionTo(2);
        await sendReply(`✅ ${farmer.tempListing.produce} selected.\n\nPlease enter your Base Price (minimum expected price) per kg.\n*(Type the amount in ₹)*`);
      } else {
        await sendReply("Invalid choice. Please select your crop:\n\n*Reply with the number:*\n1️⃣ 🍅 Tomatoes\n2️⃣ 🧅 Onions\n3️⃣ 🌾 Wheat");
      }
      break;

    case 2:
      // STATE 2: Base Price Config
      const parsedPrice = parseFloat(body.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        farmer.tempListing.minPrice = parsedPrice;
        transitionTo(3);
        await sendReply(`Summary:\n\n🍅 *Crop:* ${farmer.tempListing.produce}\n💰 *Base Price:* ₹${farmer.tempListing.minPrice}/kg\n\nConfirm listing?\n\n*Reply with:*\n✅ YES\n❌ NO`);
      } else {
        await sendReply("⚠️ Price must be a valid number. Please type your minimum expected price per kg (e.g. 35).");
      }
      break;

    case 3:
      // STATE 3: Confirmation and Execution
      if (lower === 'yes' || lower === 'y' || lower.includes('yes')) {
        
        try {
          // Push to DB
          const listingPayload = {
            phone,
            images: [],
            weight: farmer.tempListing.weight,
            produce: farmer.tempListing.produce,
            minPrice: farmer.tempListing.minPrice,
            harvestDate: new Date().toISOString(),
            trustScore: 100
          };
          
          const listingResult = await createListing(listingPayload);
          
          await sendReply(`🚀 *Listing is LIVE!*\n\n🔹 *ID:* #${listingResult.listingId.substring(0,8).toUpperCase()}\n🔹 *Closes in:* 24 hours\n\nYou will receive automated updates when buyers bid!`);
        } catch (e) {
          console.error('[WhatsApp] listing creation error:', e);
          await sendReply("Oops! Something went wrong confirming your listing on the blockchain. Please try again later.");
        }
        
        // Reset State
        transitionTo(0);
        farmer.tempListing = {};

      } else if (lower === 'no' || lower === 'n') {
        transitionTo(0);
        farmer.tempListing = {};
        await sendReply("❌ Listing cancelled. Say 'Hi' whenever you want to start over!");
      } else {
        await sendReply("Please confirm:\n✅ YES\n❌ NO");
      }
      break;

    default:
      transitionTo(0);
      await sendReply("State reset. Say 'Hi' to start.");
      break;
  }
};

client.on('qr', (qr) => {
  lastQr = qr;
  lastAuthFailure = null;
  qrcode.generate(qr, { small: true });
  console.log('WhatsApp QR code received. Scan it with your phone.');
});

client.on('ready', () => {
  clientReady = false;
  console.log('WhatsApp client is ready.');
});

client.on('authenticated', () => {
  console.log('WhatsApp client authenticated successfully.');
});

client.on('auth_failure', (msg) => {
  clientReady = false;
  lastAuthFailure = msg;
  console.error('WhatsApp authentication failed:', msg);
});

client.on('disconnected', async (reason) => {
  clientReady = false;
  console.warn('WhatsApp client disconnected:', reason);
  try {
    await client.destroy();
  } catch (err) {
    console.error('Error destroying WhatsApp client after disconnect:', err);
  }
  setTimeout(() => client.initialize(), 5000);
});

client.on('message', async (msg) => {
  try {
    if (!clientReady) return;
    if (msg.from.endsWith('@g.us')) return; // ignore groups
    await handleFarmerMessage(msg);
  } catch (err) {
    console.error('[WhatsApp] message handler error:', err);
  }
});

client.initialize();

const notifyFarmerNewBid = async (farmerPhone, bidAmount, quantity, buyerCity) => {
  const total = bidAmount * quantity;
  const message = `New bid on your listing!\nBuyer wants ${quantity}kg at Rs.${bidAmount}/kg\nTotal: Rs.${total}\nReply ACCEPT to lock this deal or wait for higher bids.`;
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerDealLocked = async (farmerPhone, listingId, buyerDetails) => {
  const message = `Deal LOCKED!\nPrepare your produce for pickup.\nOur delivery partner will contact you within 24 hours.\nPlease upload a photo of your packed produce when ready.`;
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerPaymentSent = async (farmerPhone, amount, upiId) => {
  const message = `Payment of Rs.${amount} has been sent to ${upiId}.\nThank you for using FARM BID!`;
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerDispute = async (farmerPhone, listingId, reason) => {
  const message = `A dispute has been raised on listing ${listingId}.\nReason: ${reason}\nOur team will contact you within 2 hours to resolve this.`;
  return sendMessage({ to: farmerPhone, body: message });
};

const notifyFarmerListingExpired = async (farmerPhone, listingId) => {
  const message = `Your listing ${listingId} has expired with no bids.\nReply 1 to relist at a lower price.`;
  return sendMessage({ to: farmerPhone, body: message });
};

module.exports = {
  sendWhatsAppMessage: sendMessage,
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
