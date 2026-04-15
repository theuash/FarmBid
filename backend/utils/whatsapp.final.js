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
const {
  createButtonMenu,
  createLanguageMenu,
  createMainMenu,
  createProduceSelectionMenu,
  createConfirmationMenu,
  createProgressMenu,
  createServicesMenu,
  parseButtonResponse
} = require('./whatsappInteractive');

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
      violations: 0,
      language: 'en', // Default language
      currentMenu: null, // Track current menu buttons
      lastMenuTimestamp: null // Prevent rapid menu changes
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
  const phone = formatPhone(msg.from);
  if (!phone) {
    console.warn('[WhatsApp] could not parse sender phone from', msg.from);
    return;
  }

  const farmer = getOrCreateFarmer(phone);
  const body = msg.body?.trim() || '';
  const lower = body.toLowerCase();
  let reply = null;

  const sendReply = async (text) => {
    if (text) {
      await msg.reply(text);
    }
  };

  const transitionState = (nextState) => {
    logStateTransition(phone, farmer.state, nextState);
    farmer.state = nextState;
  };

  if (farmer.state === 0) {
    if (lower === 'yes' || lower === 'y') {
      transitionState(1);
      farmer.listingStep = null;
      reply = 'Please send your 12-digit Aadhaar number.';
    } else {
      reply = 'Welcome to FARM BID! Are you a farmer? Reply YES to register.';
    }
    await sendReply(reply);
    return;
  }

  if (farmer.state === 1) {
    if (/^\d{12}$/.test(body)) {
      const result = await verifyAadhaar(body);
      if (result.success) {
        farmer.aadhaar = hashAadhaar(body);
        farmer.name = result.name;
        transitionState(2);
        reply = `Aadhaar verified for ${result.name}. Please send the 6-digit OTP.`;
      } else {
        reply = 'Invalid Aadhaar. Please try again.';
      }
    } else {
      reply = 'Aadhaar must be 12 digits. Please send your 12-digit Aadhaar number.';
    }
    await sendReply(reply);
    return;
  }

  if (farmer.state === 2) {
    if (/^\d{6}$/.test(body)) {
      const result = await verifyOTP(phone, body);
      if (result.success) {
        transitionState(3);
        reply = `Identity verified! Welcome ${farmer.name}. Please send your UPI ID for payment (example: yourname@upi).`;
      } else {
        reply = 'Wrong OTP. Try again.';
      }
    } else {
      reply = 'OTP must be 6 digits. Please send the OTP again.';
    }
    await sendReply(reply);
    return;
  }

  if (farmer.state === 3) {
    if (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(body)) {
      const result = await verifyUPI(body);
      if (result.success) {
        farmer.upiId = body;
        farmer.trustScore = 100;
        farmer.registeredAt = new Date();
        farmer.totalListings = farmer.totalListings || 0;
        farmer.violations = farmer.violations || 0;
        transitionState(4);
        farmer.listingStep = null;
        farmer.tempListing = {};
        reply = `UPI verified! You are now registered, ${farmer.name}.\n${buildRegisteredMenu(farmer.name)}`;
      } else {
        reply = 'UPI verification failed. Please check and retry.';
      }
    } else {
      reply = 'Invalid UPI format. Please send your UPI ID like yourname@upi.';
    }
    await sendReply(reply);
    return;
  }

  if (farmer.state === 4) {
    if (lower === '1') {
      transitionState(5);
      farmer.listingStep = 'awaiting_photo';
      farmer.tempListing = {};
      reply = 'Please send a clear photo of your produce.';
      await sendReply(reply);
      return;
    }

    if (lower === '2') {
      const activeListings = Array.from(listingStore.values()).filter(
        (listing) => listing.farmerPhone === phone && listing.status === 'active'
      );

      if (activeListings.length === 0) {
        reply = 'You have no active listings right now. Reply 1 to create a new listing.';
      } else {
        const summary = activeListings
          .map(
            (listing) => `ID: ${listing.listingId}\nProduce weight: ${listing.weight}kg\nMin price: ₹${listing.minPrice}/kg\nCloses at: ${new Date(listing.auctionClosesAt).toLocaleString()}`
          )
          .join('\n\n');
        reply = `Your active listings:\n\n${summary}`;
      }
      await sendReply(reply);
      return;
    }

    if (lower === '3') {
      reply = `Your trust score is ${farmer.trustScore}/100.`;
      await sendReply(reply);
      return;
    }

    reply = `Sorry, I did not understand that.\n${buildRegisteredMenu(farmer.name)}`;
    await sendReply(reply);
    return;
  }

  if (farmer.state === 5) {
    const step = farmer.listingStep;

    if (step === 'awaiting_photo') {
      if (msg.hasMedia) {
        try {
          const photoPath = await saveMedia(msg, phone);
          farmer.tempListing.photoPath = photoPath;
          farmer.listingStep = 'awaiting_weight';
          reply = 'Photo received! Now send the weight in kg (numbers only). Example: 100';
        } catch (err) {
          reply = 'Could not save the photo. Please send it again.';
        }
      } else {
        reply = 'Please send a clear photo of your produce.';
      }
      await sendReply(reply);
      return;
    }

    if (step === 'awaiting_weight') {
      if (/^\d+(\.\d+)?$/.test(body)) {
        farmer.tempListing.weight = parseFloat(body);
        farmer.listingStep = 'awaiting_min_price';
        reply = 'Weight noted! What is your minimum price per kg in rupees? Example: 40';
      } else {
        reply = 'Weight must be a number. Please send the weight in kg. Example: 100';
      }
      await sendReply(reply);
      return;
    }

    if (step === 'awaiting_min_price') {
      if (/^\d+(\.\d+)?$/.test(body)) {
        farmer.tempListing.minPrice = parseFloat(body);
        farmer.listingStep = 'awaiting_harvest_date';
        reply = 'Almost done! When will the produce be ready for pickup? Send date as DD-MM-YYYY';
      } else {
        reply = 'Price must be a number. Please send your minimum price per kg in rupees.';
      }
      await sendReply(reply);
      return;
    }

    if (step === 'awaiting_harvest_date') {
      if (/^\d{2}-\d{2}-\d{4}$/.test(body)) {
        const [day, month, year] = body.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        ) {
          farmer.tempListing.harvestDate = body;
          const listingPayload = {
            phone,
            photo: farmer.tempListing.photoPath,
            weight: farmer.tempListing.weight,
            minPrice: farmer.tempListing.minPrice,
            harvestDate: farmer.tempListing.harvestDate,
            trustScore: farmer.trustScore
          };

          const listingResult = await createListing(listingPayload);
          const newListing = {
            listingId: listingResult.listingId,
            farmerPhone: phone,
            photoPath: farmer.tempListing.photoPath,
            weight: farmer.tempListing.weight,
            minPrice: farmer.tempListing.minPrice,
            harvestDate: farmer.tempListing.harvestDate,
            qualityIndex: listingResult.qualityIndex,
            status: 'active',
            auctionClosesAt: listingResult.auctionClosesAt,
            createdAt: new Date().toISOString(),
            bids: []
          };

          listingStore.set(newListing.listingId, newListing);
          farmer.totalListings += 1;
          farmer.state = 4;
          farmer.listingStep = null;
          farmer.tempListing = {};

          reply = `Your listing is LIVE! Listing ID: ${newListing.listingId}. Auction closes at ${new Date(newListing.auctionClosesAt).toLocaleString()}. Buyers can now bid on your produce. We will notify you of bids.`;
        } else {
          reply = 'The date you sent is invalid. Please send harvest date as DD-MM-YYYY.';
        }
      } else {
        reply = 'Invalid date format. Please send the harvest date as DD-MM-YYYY.';
      }
      await sendReply(reply);
      return;
    }

    reply = 'Please follow the listing creation prompts. Send the requested information.';
    await sendReply(reply);
    return;
  }

  reply = 'Sorry, I did not understand that. Please follow the current prompt.';
  await sendReply(reply);
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
