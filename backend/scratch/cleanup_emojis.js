const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Lucide Imports
const oldImports = "LogOut, User, Fingerprint";
const newImports = "LogOut, User, Fingerprint, Receipt, Handshake";
content = content.replace(oldImports, newImports);

// 2. Clean up English Demo Data
// We use a regex to find the english array and replace it with a clean version
const englishRegex = /english: \[\s+\{ type: 'bot', text: 'Welcome to FarmBid![\s\S]+?\}\s+\]/;
const cleanEnglish = `english: [
    { type: 'bot', text: 'Welcome to FarmBid! I am your assistant. How can I help you today?' },
    { type: 'bot', text: 'Reply with:\\n1. Create new listing\\n2. Check my listings\\n3. View earnings\\n4. Help' },
    { type: 'user', text: '1' },
    { type: 'bot', text: "Great! Let's create a new listing. Please send a photo of your produce." },
    { type: 'user', text: '[Photo of tomatoes]', isImage: true },
    { type: 'bot', text: 'Tomatoes! Quality looks Premium grade.\\n\\nWhat is the total weight (in kg)?' },
    { type: 'user', text: '500 kg' },
    { type: 'bot', text: 'Got it! 500 kg of Tomatoes.\\n\\nWhat is your minimum price per kg? (Current market: ₹30-40/kg)' },
    { type: 'user', text: '32' },
    { type: 'bot', text: 'Perfect! ₹32 per kg minimum.\\n\\nWhen was this harvested? (DD/MM or today)' },
    { type: 'user', text: 'today' },
    { type: 'bot', text: 'Your listing is being processed...\\n\\nSummary:\\n- Tomatoes: 500 kg\\n- Min Price: ₹32/kg\\n- Total Value: ₹16,000+\\n- Srinivaspur, Kolar\\n\\nAnchoring to blockchain...' },
    { type: 'bot', text: 'Listing is LIVE!\\n\\nAuction ID: #KOL-2025-0628\\nEnds in: 24 hours\\n\\nYou will receive updates when buyers bid.\\n\\nChain Hash: 0x8f9a...8f9a' }
  ]`;

content = content.replace(englishRegex, cleanEnglish);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned page.js and updated imports.');
