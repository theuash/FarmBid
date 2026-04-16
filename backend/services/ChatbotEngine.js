const ChatSession = require('../models/ChatSession');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const Listing = require('../models/Listing');
const messages = require('../utils/smsMessages');
const { verifyAadhaar, verifyUPI, createListing } = require('../utils/mockAPIs');
const { normalizeTo10Digits } = require('../utils/phoneUtils');
const aiService = require('./AIService');
const { downloadMedia, saveBase64Media } = require('../utils/mediaDownloader');

class ChatbotEngine {
  async processMessage(from, body, opts = {}) {
    const text = body ? body.trim() : '';
    const normalizedText = text.toLowerCase();
    const { mediaUrl, contentType, base64Media } = opts;
    
    // Normalize phone number for unified session key
    const phoneKey = normalizeTo10Digits(from);
    
    // Get or create session using normalized key
    let session = await ChatSession.findOne({ phoneNumber: phoneKey });
    if (!session) {
      session = new ChatSession({ phoneNumber: phoneKey });
    }

    const lang = session.language || 'en';
    let response = '';

    // Global Commands
    if (normalizedText === 'menu' || normalizedText === 'reset') {
      session.state = 'FARMER_MAIN'; // Default to role menu
      session.tempData = {};
      await session.save();
      return messages[lang].farmer_menu;
    }

    // Handle Incoming Media globally during listing flows
    if (session.state.includes('FARMER_LISTING')) {
      if (mediaUrl) {
        try {
          const filename = await downloadMedia(mediaUrl, contentType);
          if (!session.tempData.images) session.tempData.images = [];
          session.tempData.images.push(filename);
        } catch (err) {
          console.error('[Chatbot] Media download failed:', err);
        }
      } else if (base64Media) {
        try {
          const filename = await saveBase64Media(base64Media, contentType);
          if (!session.tempData.images) session.tempData.images = [];
          session.tempData.images.push(filename);
        } catch (err) {
          console.error('[Chatbot] Base64 Media save failed:', err);
        }
      }
    }

    // State Machine
    switch (session.state) {
      case 'START':
        response = messages.en.welcome;
        session.state = 'SELECT_LANGUAGE';
        break;

      case 'SELECT_LANGUAGE':
        if (text === '1') {
          session.language = 'en';
          session.state = 'SELECT_ROLE';
          response = messages.en.select_role;
        } else if (text === '2') {
          session.language = 'kn';
          session.state = 'SELECT_ROLE';
          response = messages.kn.select_role;
        } else {
          response = messages.en.welcome;
        }
        break;

      case 'SELECT_ROLE':
        if (text === '1') {
          session.role = 'farmer';
          session.state = 'FARMER_MAIN';
          response = messages[session.language].farmer_menu;
        } else if (text === '2') {
          session.role = 'buyer';
          session.state = 'BUYER_MAIN';
          response = messages[session.language].buyer_menu;
        } else {
          response = messages[session.language].select_role;
        }
        break;

      case 'FARMER_MAIN':
        if (text === '1') {
          session.state = 'FARMER_REG_AADHAAR';
          response = messages[session.language].reg_aadhaar;
        } else if (text === '2') {
          session.state = 'FARMER_LISTING_CROP';
          response = messages[session.language].listing_crop;
        } else if (text === '3') {
          const listings = await Listing.find({ farmerPhone: from }).limit(3);
          if (listings.length > 0) {
            response = listings.map(l => `${l.produce}: ${l.quantity}${l.unit} - ₹${l.minPricePerKg}/kg`).join('\n');
          } else {
            response = "No active listings found.";
          }
          response += `\n\n${messages[session.language].farmer_menu}`;
        } else if (text.length > 15) {
          // AI HEURISTIC: Try parsing as a quick listing
          const parsed = await aiService.parseListing(text);
          if (parsed && parsed.produce && parsed.quantity) {
            session.tempData = {
              produce: parsed.produce,
              quantity: parsed.quantity,
              unit: parsed.unit || 'kg',
              price: parsed.price,
              location: parsed.location || 'Not specified'
            };
            session.state = 'FARMER_QUICK_CONFIRM';
            response = messages[session.language].listing_confirm_ai
              .replace('{produce}', parsed.produce)
              .replace('{qty}', parsed.quantity)
              .replace('{unit}', parsed.unit || 'kg')
              .replace('{price}', parsed.price || '?')
              .replace('{loc}', parsed.location || '?');
          } else {
            response = messages[session.language].farmer_menu;
          }
        } else {
          response = messages[session.language].farmer_menu;
        }
        break;

      case 'FARMER_QUICK_CONFIRM':
        if (normalizedText === 'yes' || normalizedText === 'y' || text === '1') {
          session.state = 'FARMER_LISTING_PHOTO';
          response = messages[session.language].listing_photo;
        } else {
          session.state = 'FARMER_MAIN';
          response = messages[session.language].farmer_menu;
          session.tempData = {};
        }
        break;

      case 'FARMER_REG_AADHAAR':
        if (/^\d{12}$/.test(text)) {
          const result = await verifyAadhaar(text);
          if (result.success) {
            session.tempData.aadhaar = text;
            session.tempData.name = result.name;
            session.state = 'FARMER_REG_UPI';
            response = messages[session.language].reg_upi;
          } else {
            response = "Invalid Aadhaar. " + messages[session.language].reg_aadhaar;
          }
        } else {
          response = messages[session.language].reg_aadhaar;
        }
        break;

      case 'FARMER_REG_UPI':
        if (text.includes('@')) {
          const result = await verifyUPI(text);
          if (result.success) {
            let farmer = await Farmer.findOne({ phone: from });
            if (!farmer) {
              const count = await Farmer.countDocuments();
              farmer = new Farmer({
                code: `F${String(count + 1).padStart(3, '0')}`,
                name: session.tempData.name || 'Chatbot User',
                phone: from,
                upiId: text,
                aadhaarVerified: true,
                upiVerified: true,
                language: session.language === 'kn' ? 'Kannada' : 'English'
              });
              await farmer.save();
            }
            session.state = 'FARMER_MAIN';
            response = messages[session.language].reg_success + "\n\n" + messages[session.language].farmer_menu;
          } else {
            response = "Invalid UPI. " + messages[session.language].reg_upi;
          }
        } else {
          response = messages[session.language].reg_upi;
        }
        break;

      case 'FARMER_LISTING_CROP':
        session.tempData.produce = text;
        session.state = 'FARMER_LISTING_QUANTITY';
        response = messages[session.language].listing_quantity;
        break;

      case 'FARMER_LISTING_QUANTITY':
        if (!isNaN(text)) {
          session.tempData.quantity = parseFloat(text);
          session.state = 'FARMER_LISTING_PRICE';
          response = messages[session.language].listing_price;
        } else {
          response = messages[session.language].listing_quantity;
        }
        break;

      case 'FARMER_LISTING_PRICE':
        if (!isNaN(text)) {
          session.tempData.price = parseFloat(text);
          session.state = 'FARMER_LISTING_LOCATION';
          response = messages[session.language].listing_location;
        } else {
          response = messages[session.language].listing_price;
        }
        break;

      case 'FARMER_LISTING_LOCATION':
        session.tempData.location = text;
        session.state = 'FARMER_LISTING_PHOTO';
        response = messages[session.language].listing_photo;
        break;

      case 'FARMER_LISTING_PHOTO':
        // Finalize Listing
        const farmerRecord = await Farmer.findOne({ phone: from });
        if (!farmerRecord) {
          response = "Please register first!\n\n" + messages[session.language].farmer_menu;
          session.state = 'FARMER_MAIN';
        } else {
          const newListing = new Listing({
            farmerId: farmerRecord._id,
            farmerCode: farmerRecord.code,
            farmerName: farmerRecord.name,
            farmerTrustScore: farmerRecord.trustScore || 80,
            produce: session.tempData.produce,
            quantity: session.tempData.quantity,
            unit: session.tempData.unit || 'kg',
            minPricePerKg: session.tempData.price,
            currentBidPerKg: session.tempData.price,
            location: session.tempData.location,
            images: session.tempData.images || [],
            pincode: '000000',
            harvestDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            auctionEndsAt: new Date(Date.now() + 24*60*60*1000),
            status: 'live',
            source: 'whatsapp'
          });
          await newListing.save();

          response = messages[session.language].listing_success.replace('{id}', newListing._id.toString().slice(-6));
          response += "\n\n" + messages[session.language].farmer_menu;
          session.state = 'FARMER_MAIN';
          session.tempData = {};
        }
        break;

      case 'BUYER_MAIN':
        // (Existing buyer logic)
        response = messages[session.language].buyer_menu;
        break;

      default:
        response = messages.en.welcome;
        session.state = 'SELECT_LANGUAGE';
    }

    session.lastMessageAt = Date.now();
    session.markModified('tempData');
    await session.save();
    return response;
  }
}

module.exports = new ChatbotEngine();
