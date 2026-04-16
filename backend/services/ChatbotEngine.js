const ChatSession = require('../models/ChatSession');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const Listing = require('../models/Listing');
const messages = require('../utils/smsMessages');
const { verifyAadhaar, verifyUPI, createListing } = require('../utils/mockAPIs');
const { normalizeTo10Digits } = require('../utils/phoneUtils');
const { downloadMedia, saveBase64Media } = require('../utils/mediaDownloader');

// Helper to find farmer across various possible phone formats in DB
const findFarmerByPhone = async (phoneKey) => {
  if (!phoneKey) return null;
  
  // 1. Try exact 10-digit match (standard format)
  let farmer = await Farmer.findOne({ phone: phoneKey });
  if (farmer) return farmer;

  // 2. Try the format used in original seeder: "+91 98765 43210"
  const seederFormat = `+91 ${phoneKey.slice(0, 5)} ${phoneKey.slice(5)}`;
  farmer = await Farmer.findOne({ phone: seederFormat });
  if (farmer) return farmer;

  // 3. Try standard international format: "+91XXXXXXXXXX"
  farmer = await Farmer.findOne({ phone: `+91${phoneKey}` });
  if (farmer) return farmer;

  // 4. Fallback search: last 10 digits endsWith
  farmer = await Farmer.findOne({ phone: new RegExp(phoneKey.split('').join('\\s*') + '$') });
  
  return farmer;
};

class ChatbotEngine {
  async processMessage(from, body, opts = {}) {
    const text = body ? body.trim() : '';
    const normalizedText = text.toLowerCase();
    const { mediaUrl, contentType, base64Media } = opts;
    
    // Normalize phone number for unified session key and database lookups
    const phoneKey = normalizeTo10Digits(from);
    
    // Get or create session using normalized key
    let session = await ChatSession.findOne({ phoneNumber: phoneKey });
    if (!session) {
      session = new ChatSession({ phoneNumber: phoneKey });
    }

    const lang = session.language || 'en';

    // Natural Language Command Detection (Global Fallback)
    // Support English and Kannada keywords for navigation
    const isStartCommand = /^(hi|hello|hey|namaste|ನಮಸ್ಕಾರ)$/i.test(normalizedText);
    const isBackCommand = /back|go back|return|previous|ಹಿಂದಕ್ಕೆ|hinde/i.test(normalizedText);
    const isMenuCommand = /menu|home|start|main|ಮೆನು/i.test(normalizedText);

    if (isStartCommand) {
      session.state = 'START';
      session.tempData = {};
      await session.save();
      return messages.en.welcome;
    }

    if (isMenuCommand) {
      session.state = 'FARMER_MAIN';
      session.tempData = {};
      await session.save();
      return messages[lang].farmer_menu;
    }

    if (isBackCommand) {
      // Intelligent state backtracking for every question
      const stateMap = {
        'FARMER_REG_NAME': 'FARMER_MAIN',
        'FARMER_REG_UPI': 'FARMER_REG_NAME',
        'FARMER_LISTING_CROP': 'FARMER_MAIN',
        'FARMER_LISTING_QUANTITY': 'FARMER_LISTING_CROP',
        'FARMER_LISTING_PRICE': 'FARMER_LISTING_QUANTITY',
        'FARMER_LISTING_LOCATION': 'FARMER_LISTING_PRICE',
        'FARMER_LISTING_PHOTO': 'FARMER_LISTING_LOCATION',
        'SELECT_ROLE': 'SELECT_LANGUAGE',
        'FARMER_MAIN': 'SELECT_ROLE'
      };
      
      const prevState = stateMap[session.state];
      if (prevState) {
        session.state = prevState;
        await session.save();
        
        // Return appropriate message for the previous state
        const backMessages = {
          'SELECT_LANGUAGE': messages.en.welcome,
          'SELECT_ROLE': messages[lang].select_role,
          'FARMER_MAIN': messages[lang].farmer_menu,
          'FARMER_REG_NAME': messages[lang].reg_name,
          'FARMER_REG_UPI': messages[lang].reg_upi,
          'FARMER_LISTING_CROP': messages[lang].listing_crop,
          'FARMER_LISTING_QUANTITY': messages[lang].listing_quantity,
          'FARMER_LISTING_PRICE': messages[lang].listing_price,
          'FARMER_LISTING_LOCATION': messages[lang].listing_location,
        };
        
        const returnText = lang === 'kn' ? '🔙 ಹಿಂದಕ್ಕೆ ಹೋಗಲಾಗುತ್ತಿದೆ...\n\n' : '🔙 Going back...\n\n';
        return `${returnText}${backMessages[prevState] || messages[lang].farmer_menu}`;
      }
    }

    let response = '';

    // Handle Incoming Media globally during listing flows
    if (session.state.includes('FARMER_LISTING')) {
      if (mediaUrl || base64Media) {
        try {
          const filename = mediaUrl ? await downloadMedia(mediaUrl, contentType) : await saveBase64Media(base64Media, contentType);
          if (!session.tempData.images) session.tempData.images = [];
          session.tempData.images.push(filename);
        } catch (err) {
          console.error('[Chatbot] Media save error:', err);
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
          session.state = 'FARMER_REG_NAME';
          response = messages[session.language].reg_name;
        } else if (text === '2') {
          session.state = 'FARMER_LISTING_CROP';
          response = messages[session.language].listing_crop;
        } else if (text === '3') {
          const farmerRecord = await findFarmerByPhone(phoneKey);
          if (farmerRecord) {
            const listings = await Listing.find({ farmerId: farmerRecord._id }).sort({ createdAt: -1 }).limit(3);
            if (listings.length > 0) {
              const listHeader = session.language === 'kn' ? 'ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಲಿಸ್ಟಿಂಗ್‌ಗಳು:' : 'Your Recent Listings:';
              const listText = listings.map(l => `• ${l.produce}: ${l.quantity}${l.unit} - ₹${l.minPricePerKg}/kg`).join('\n');
              response = `${listHeader}\n${listText}`;
            } else {
              response = session.language === 'kn' ? "ಯಾವುದೇ ಲಿಸ್ಟಿಂಗ್‌ಗಳು ಕಂಡುಬಂದಿಲ್ಲ." : "No active listings found.";
            }
          } else {
            response = session.language === 'kn' ? "ಪ್ರೊಫೈಲ್ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೊದಲು ನೋಂದಾಯಿಸಿ!" : "Profile not found. Please register first!";
          }
          response += `\n\n${messages[session.language].farmer_menu}`;
        } else if (text === '4') {
            const farmerRecord = await findFarmerByPhone(phoneKey);
            if (farmerRecord) {
                const profileTitle = session.language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ವಿವರಗಳು:' : 'Your Profile Details:';
                response = `${profileTitle}\n👤 ${farmerRecord.name}\n📞 ${farmerRecord.phone}\n💳 UPI: ${farmerRecord.upiId}`;
            } else {
                response = session.language === 'kn' ? "ಪ್ರೊಫೈಲ್ ಕಂಡುಬಂದಿಲ್ಲ." : "Profile not found.";
            }
            response += `\n\n${messages[session.language].farmer_menu}`;
        } else {
          response = messages[session.language].farmer_menu;
        }
        break;

      case 'FARMER_REG_NAME':
        if (text.length > 2) {
          session.tempData.name = text;
          session.state = 'FARMER_REG_UPI';
          response = messages[session.language].reg_upi;
        } else {
          response = messages[session.language].reg_name;
        }
        break;

      case 'FARMER_REG_UPI':
        if (text.includes('@')) {
          const result = await verifyUPI(text);
          if (result.success) {
            let farmer = await findFarmerByPhone(phoneKey);
            if (!farmer) {
              const count = await Farmer.countDocuments();
              farmer = new Farmer({
                code: `F${String(count + 1).padStart(3, '0')}`,
                name: session.tempData.name || 'Chatbot User',
                phone: phoneKey,
                upiId: text,
                aadhaarVerified: false,
                upiVerified: true,
                language: session.language === 'kn' ? 'Kannada' : 'English'
              });
              await farmer.save();
            }
            session.state = 'FARMER_MAIN';
            response = messages[session.language].reg_success + "\n\n" + messages[session.language].farmer_menu;
          } else {
            response = (session.language === 'kn' ? "ತಪ್ಪಾದ UPI. " : "Invalid UPI. ") + messages[session.language].reg_upi;
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
        const farmerRecord = await findFarmerByPhone(phoneKey);
        if (!farmerRecord) {
          response = (session.language === 'kn' ? "ದಯವಿಟ್ಟು ಮೊದಲು ನೋಂದಾಯಿಸಿ!" : "Please register first!") + "\n\n" + messages[session.language].farmer_menu;
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

          // Sync to memory store for real-time dashboard visibility
          try {
            const { listingStore } = require('../utils/whatsapp');
            if (listingStore) {
              const memoryListing = {
                id: newListing._id.toString(),
                listingId: newListing._id.toString(),
                farmerId: newListing.farmerId.toString(),
                farmerCode: newListing.farmerCode,
                farmerName: newListing.farmerName,
                produce: newListing.produce,
                quantity: newListing.quantity,
                unit: newListing.unit || 'kg',
                minPricePerKg: newListing.minPricePerKg,
                currentBidPerKg: newListing.currentBidPerKg,
                totalBids: 0,
                location: newListing.location,
                status: 'live',
                images: newListing.images,
                auctionEndsAt: newListing.auctionEndsAt,
                createdAt: newListing.createdAt,
                source: 'whatsapp'
              };
              listingStore.set(memoryListing.id, memoryListing);
            }
          } catch (e) {
            console.error('[ChatbotSync] Error:', e.message);
          }

          response = messages[session.language].listing_success.replace('{id}', newListing._id.toString().slice(-6));
          session.state = 'FARMER_MAIN';
          session.tempData = {};
        }
        break;

      case 'BUYER_MAIN':
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
