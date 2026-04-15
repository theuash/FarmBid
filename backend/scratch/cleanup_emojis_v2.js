const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Clean up Hindi Demo Data
const hindiRegex = /hindi: \[\s+\{ type: 'bot', text: 'FarmBid[\s\S]+?\}\s+\]/;
const cleanHindi = `hindi: [
    { type: 'bot', text: 'FarmBid में आपका स्वागत है! मैं आपका सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?' },
    { type: 'bot', text: 'जवाब दें:\\n1. नई लिस्टिंग बनाएं\\n2. मेरी लिस्टिंग देखें\\n3. कमाई देखें\\n4. मदद' },
    { type: 'user', text: '1' },
    { type: 'bot', text: "बहुत अच्छा! चलिए एक नई लिस्टिंग बनाते हैं। कृपया अपनी उपज की एक फोटो भेजें।" },
    { type: 'user', text: '[टमाटर की फोटो]', isImage: true },
    { type: 'bot', text: 'टमाटर! गुणवत्ता प्रीमियम स्तर की लग रही है।\\n\\nकुल वजन (किलोग्राम में) क्या है?' },
    { type: 'user', text: '500 kg' },
    { type: 'bot', text: 'समझ गया! 500 किलो टमाटर।\\n\\nप्रति किलो आपकी न्यूनतम कीमत क्या है? (वर्तमान बाजार: ₹30-40/kg)' },
    { type: 'user', text: '32' },
    { type: 'bot', text: 'बेहतरीन! ₹32 प्रति किलो न्यूनतम।\\n\\nइसकी कटाई कब हुई थी? (DD/MM या आज)' },
    { type: 'user', text: 'आज' },
    { type: 'bot', text: 'आपकी लिस्टिंग प्रोसेस की जा रही है...\\n\\nसारांश:\\n- टमाटर: 500 kg\\n- न्यूनतम मूल्य: ₹32/kg\\n- कुल मूल्य: ₹16,000+\\n- श्रीनिवासपुर, कोलार\\n\\nब्लॉकचेन पर एंकरिंग की जा रही है...' },
    { type: 'bot', text: 'लिस्टिंग लाइव है!\\n\\nनीलामी ID: #KOL-2025-0628\\nसमाप्ति: 24 घंटे में\\n\\nखरीदारों के बोली लगाने पर आपको अपडेट मिलते रहेंगे।\\n\\nचेन हैश: 0x8f9a...8f9a' }
  ]`;

content = content.replace(hindiRegex, cleanHindi);

// Ensure no other specific corruption remains in common strings
content = content.replace(/â‚¹/g, '₹'); // Replace corrupted Rupee symbol

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned Hindi demo data and Rupee symbols.');
