const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. WhatsApp Messages replace
const startMarker = 'const whatsappMessages = {';
const endMarker = 'const formatTimeRemaining = (ms) => {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newMessagesBlock = `const whatsappMessages = {
  english: [
    { type: 'bot', text: 'Welcome to FarmBid! Please select your language / ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ / कृपया अपनी भाषा चुनें' },
    { type: 'bot', text: 'Choose Language:', isInteractive: true, options: ['🌐 English', 'ಕನ್ನಡ (Kannada)', 'हिंदी (Hindi)'] },
    { type: 'user', text: 'English' },
    { type: 'bot', text: "Great! Let's create a new listing. What type of crop do you want to list?" },
    { type: 'bot', text: 'Select Crop:', isInteractive: true, options: ['🍅 Tomatoes', '🧅 Onions', '🌾 Wheat'] },
    { type: 'user', text: '🍅 Tomatoes' },
    { type: 'bot', text: 'Tomatoes selected.\\n\\nPlease enter your Base Price (minimum expected price) per kg.\\n(Type the amount)' },
    { type: 'user', text: '₹32' },
    { type: 'bot', text: 'Summary:\\n\\n🍅 Crop: Tomatoes\\n💰 Base Price: ₹32/kg\\n\\nConfirm listing?' },
    { type: 'bot', text: 'Confirm:', isInteractive: true, options: ['✅ Yes, list it', '❌ Cancel'] },
    { type: 'user', text: '✅ Yes, list it' },
    { type: 'bot', text: 'Listing is LIVE!\\n\\nAuction ID: #KOL-2025\\nEnds in: 24 hours\\n\\nYou will receive updates when buyers bid.' }
  ],
  hindi: [
    { type: 'bot', text: 'Welcome to FarmBid! Please select your language / ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ / कृपया अपनी भाषा चुनें' },
    { type: 'bot', text: 'Choose Language:', isInteractive: true, options: ['English', 'ಕನ್ನಡ (Kannada)', '🌐 हिंदी (Hindi)'] },
    { type: 'user', text: 'हिंदी (Hindi)' },
    { type: 'bot', text: "बढ़िया! आइए एक नई लिस्टिंग बनाएं। आप किस प्रकार की फसल बेचना चाहते हैं?" },
    { type: 'bot', text: 'फसल चुनें:', isInteractive: true, options: ['🍅 टमाटर', '🧅 प्याज', '🌾 गेहूं'] },
    { type: 'user', text: '🍅 टमाटर' },
    { type: 'bot', text: 'टमाटर चुना गया।\\n\\nकृपया अपना आधार मूल्य (न्यूनतम अपेक्षित मूल्य) प्रति किलो दर्ज करें।\\n(राशि टाइप करें)' },
    { type: 'user', text: '₹32' },
    { type: 'bot', text: 'सारांश:\\n\\n🍅 फसल: टमाटर\\n💰 आधार मूल्य: ₹32/kg\\n\\nक्या आप लिस्टिंग की पुष्टि करते हैं?' },
    { type: 'bot', text: 'पुष्टि करें:', isInteractive: true, options: ['✅ हाँ, लिस्ट करें', '❌ रद्द करें'] },
    { type: 'user', text: '✅ हाँ, लिस्ट करें' },
    { type: 'bot', text: 'लिस्टिंग लाइव है!\\n\\nनीलामी ID: #KOL-2025\\n24 घंटे में समाप्त\\n\\nखरीदारों के बोली लगाने पर आपको अपडेट मिलेंगे।' }
  ],
  kannada: [
    { type: 'bot', text: 'Welcome to FarmBid! Please select your language / ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ / कृपया अपनी भाषा चुनें' },
    { type: 'bot', text: 'Choose Language:', isInteractive: true, options: ['English', '🌐 ಕನ್ನಡ (Kannada)', 'हिंदी (Hindi)'] },
    { type: 'user', text: 'ಕನ್ನಡ (Kannada)' },
    { type: 'bot', text: "ಉತ್ತಮ! ಹೊಸ ಪಟ್ಟಿಯನ್ನು ರಚಿಸೋಣ. ನೀವು ಯಾವ ರೀತಿಯ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?" },
    { type: 'bot', text: 'ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:', isInteractive: true, options: ['🍅 ಟೊಮ್ಯಾಟೊ', '🧅 ಈರುಳ್ಳಿ', '🌾 ಗೋಧಿ'] },
    { type: 'user', text: '🍅 ಟೊಮ್ಯಾಟೊ' },
    { type: 'bot', text: 'ಟೊಮ್ಯಾಟೊ ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.\\n\\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೂಲ ಬೆಲೆಯನ್ನು (ಕನಿಷ್ಠ ನಿರೀಕ್ಷಿತ ಬೆಲೆ) ಪ್ರತಿ ಕೆಜಿಗೆ ನಮೂದಿಸಿ.\\n(ಮೊತ್ತವನ್ನು ಟೈಪ್ ಮಾಡಿ)' },
    { type: 'user', text: '₹32' },
    { type: 'bot', text: 'ಸಾರಾಂಶ:\\n\\n🍅 ಬೆಳೆ: ಟೊಮ್ಯಾಟೊ\\n💰 ಮೂಲ ಬೆಲೆ: ₹32/kg\\n\\nಪಟ್ಟಿಯನ್ನು ಖಚಿತಪಡಿಸುತ್ತೀರಾ?' },
    { type: 'bot', text: 'ಖಚಿತಪಡಿಸಿ:', isInteractive: true, options: ['✅ ಹೌದು, ಪಟ್ಟಿ ಮಾಡಿ', '❌ ರದ್ದುಮಾಡಿ'] },
    { type: 'user', text: '✅ ಹೌದು, ಪಟ್ಟಿ ಮಾಡಿ' },
    { type: 'bot', text: 'ಪಟ್ಟಿ ಸಕ್ರಿಯವಾಗಿದೆ!\\n\\nಹರಾಜು ID: #KOL-2025\\n24 ಗಂಟೆಗಳಲ್ಲಿ ಕೊನೆಗೊಳ್ಳುತ್ತದೆ\\n\\nಖರೀದಿದಾರರು ಬಿಡ್ ಮಾಡಿದಾಗ ನಿಮಗೆ ಅಪ್ಡೇಟ್ ಸಿಗುತ್ತದೆ.' }
  ]
}

// Format time remaining
`;
  content = content.substring(0, startIndex) + newMessagesBlock + content.substring(endIndex + endMarker.length);
} else {
  console.log("Could not find WhatsApp messages block bounds");
  process.exit(1);
}

// 2. Interactive Message UI Rendering Patch
const renderStart = '{msg.isImage ? (';
const renderEnd = '<p className="text-[10px] text-muted-foreground text-right mt-1">';

const rsIndex = content.indexOf(renderStart);
const reIndex = content.indexOf(renderEnd);

if (rsIndex !== -1 && reIndex !== -1) {
  const newRenderBlock = `{msg.isImage ? (
                  <img
                    src="https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Produce"
                    className="w-48 h-32 object-cover rounded"
                  />
                ) : msg.isInteractive ? (
                  <div className="flex flex-col w-full min-w-[200px]">
                    <p className="text-sm whitespace-pre-line mb-2">{msg.text}</p>
                    <div className="flex flex-col border-t border-gray-200 dark:border-zinc-700 pt-1">
                      {msg.options.map((opt, i) => (
                        <div key={i} className="text-[#00a884] dark:text-[#00a884] font-medium text-sm text-center py-2.5 border-b border-gray-200 dark:border-zinc-700 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                )}
                `;
  content = content.substring(0, rsIndex) + newRenderBlock + content.substring(reIndex);
} else {
  console.log("Could not find WhatsApp UI renderer block bounds");
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully rebuilt WhatsApp Interactive Flow");
