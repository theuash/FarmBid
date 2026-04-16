const mongoose = require('mongoose');
require('dotenv').config();
const chatbotEngine = require('./services/ChatbotEngine');
const ChatSession = require('./models/ChatSession');
const Listing = require('./models/Listing');
const Farmer = require('./models/Farmer');

async function testAdvancedChatbot() {
  console.log('🧪 Starting FarmBid Advanced SMS Chatbot Test (AI & MMS)\n');

  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/farmbid_db');
    console.log('✅ Connected to MongoDB\n');

    const testPhone = '+919999999999';

    // Clear previous sessions for a clean test
    await ChatSession.deleteMany({ phoneNumber: testPhone });
    await Farmer.deleteMany({ phone: testPhone });
    console.log('🧹 Cleaned up existing test data.\n');

    const send = async (text, opts = {}) => {
      console.log(`👤 USER: ${text || '[IMAGE]'}`);
      const reply = await chatbotEngine.processMessage(testPhone, text, opts);
      console.log(`🤖 BOT: ${reply}\n`);
      return reply;
    };

    // --- TEST 1: REGISTRATION ---
    await send('Hello');
    await send('1'); // English
    await send('1'); // Farmer
    await send('1'); // Register
    await send('123456789012'); // Aadhaar
    await send('sachin@upi'); // UPI
    console.log('✅ Farmer Registered.\n');

    // --- TEST 2: AI QUICK LISTING (Option 1) ---
    console.log('--- Testing AI Quick Listing ---');
    // Note: This relies on OpenAI. If no key, it will fall back to normal behavior.
    // We simulate a long sentence.
    await send('I want to sell 100 quintals of Onions for 25 rupees in Nashik');
    
    // If AI worked, it should be in FARMER_QUICK_CONFIRM
    await send('YES'); // Confirm AI extraction

    // --- TEST 3: MMS PHOTO (Option 2) ---
    console.log('--- Testing MMS Photo Upload ---');
    // We simulate an incoming media URL in the photo state
    await send('', { 
      mediaUrl: 'https://raw.githubusercontent.com/sachin/farm/main/sample_onion.jpg', 
      contentType: 'image/jpeg' 
    });

    // Check DB for the listing
    const listing = await Listing.findOne({ produce: /Onion/i });
    if (listing) {
      console.log(`✅ SUCCESS: AI Listing created with ID: ${listing._id}`);
      console.log(`📑 Produce: ${listing.produce}, Qty: ${listing.quantity}${listing.unit}, Price: ₹${listing.minPricePerKg}`);
      console.log(`🖼️ Images: ${JSON.stringify(listing.images)}`);
    } else {
      console.log('❌ FAILURE: AI Listing not found.');
    }

    console.log('\n✅ Advanced functional test completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testAdvancedChatbot();
