# FarmBid WhatsApp Integration - Setup Guide

## Overview

The WhatsApp integration for FarmBid has been completely redesigned to provide an interactive, button-based experience for farmers. The system now features:

- **Language Selection**: English and Kannada support
- **Interactive Menus**: Button-like navigation using emoji and numbered options
- **Step-by-Step Guidance**: Progress indicators for listing creation
- **Farmer-Friendly Design**: Simple text-based menus that don't require complicated typing

## New Features

### 1. Language Support (English & Kannada)
- Users are presented with a language selection menu on first contact
- All messages are localized based on user preference
- Messages use emojis for visual clarity

### 2. Interactive Menu System
The system now presents menus with numbered options:
```
🌍 SELECT YOUR LANGUAGE

Welcome to FarmBid! Please choose your preferred language.

🇬🇧 1. English
🇮🇳 2. ಕನ್ನಡ

_Reply with the number (1, 2, 3...) or the option name_
```

Users can respond with:
- The number (e.g., "1")
- The option label (e.g., "English")
- A shortened version of the label

### 3. Progressive Listing Creation
Users see progress indicators while creating listings:
```
📋 LISTING CREATION PROGRESS

✅ 1. Photo
⚖️ 2. Weight ← You are here
⭕ 3. Price
⭕ 4. Harvest Date
```

### 4. Main Menu Options
After registration, farmers can:
- 📸 Create New Listing
- 📋 View Active Listings
- ⭐ View My Trust Score
- 🎯 More Services

## File Structure

### New Files
- **`backend/utils/whatsappInteractive.js`** - Interactive messaging utilities
  - Button menu creation
  - Language selection menus
  - Progress indicators
  - Button response parsing

### Updated Files
- **`backend/utils/whatsapp.final.js`** - Main WhatsApp integration
  - Integrated with interactive messaging
  - New state management (0, 0.5, 0.75, 1-5)
  - Multi-language support
  - Button-based navigation

## Installation & Setup

### 1. Install Dependencies
All required dependencies are already in package.json. Just ensure you have the latest versions:

```bash
cd backend
npm install
```

### 2. Required Environment Variables
Add these to your `.env` file:

```env
WHATSAPP_SESSION_PATH=.wwebjs_auth
WHATSAPP_HEADLESS=true
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome (optional)
```

### 3. Start the WhatsApp Service

```bash
# From backend directory
npm start
# or for development with auto-reload
npm run dev
```

You'll see a QR code in the terminal. Scan it with WhatsApp to authenticate:
```
📱 [WhatsApp] QR Code received. Scan with your phone:
```

### 4. Verify it's Running
Look for these logs:
```
✅ WhatsApp client is ready.
✅ WhatsApp client authenticated successfully.
[WhatsApp] Client initialization started...
```

## User Flow Diagram

```
User sends "Hi" → Language Selection (EN/KN)
    ↓
Farmer Confirmation → Aadhaar Verification
    ↓
OTP Verification → UPI Verification
    ↓
Main Menu Selection
    ├─ 1. Create Listing
    │   ├─ Select Produce
    │   ├─ Send Photo
    │   ├─ Send Weight
    │   ├─ Send Price
    │   └─ Send Harvest Date
    ├─ 2. View Listings
    ├─ 3. View Trust Score
    └─ 4. More Services
```

## State Management

The system uses numbered states:

| State | Description |
|-------|-------------|
| 0 | First contact / awaiting language selection |
| 0.5 | Language selected, awaiting farmer confirmation |
| 0.75 | Farmer confirmation received, awaiting Aadhaar |
| 1 | Aadhaar verification |
| 2 | OTP verification |
| 3 | UPI verification |
| 4 | Registered farmer - main menu |
| 5 | Listing creation in progress |

## Localization

Messages are stored in language objects:

```javascript
const messages = {
  en: {
    title: '🌍 SELECT YOUR LANGUAGE',
    message: 'Welcome to FarmBid! Please choose your preferred language.',
    buttons: [...]
  },
  kn: {
    title: '🌍 ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ',
    message: 'FarmBid ಗೆ ಸ್ವಾಗತ!',
    buttons: [...]
  }
};
```

Language codes:
- `en` - English
- `kn` - Kannada

## Testing Locally

### 1. Scan QR Code
When you run the service, a QR code will appear in the terminal. Scan it with the WhatsApp account you want to test with.

### 2. Send Test Messages
Send messages like:
- "Hi" - Starts the registration flow
- "1" - Selects the first option
- "English" - Selects by name
- "EN" - Shorthand selection

### 3. Check Logs
Monitor the terminal for logs:
```
[WhatsApp] +91XXXXXXXXXX state transition 0 -> 0.5
[WhatsApp] farmer message: Hi
```

## Troubleshooting

### QR Code Not Appearing
- Check if Puppeteer is installed correctly
- Verify Chrome/Chromium is installed on your system
- Try setting `PUPPETEER_EXECUTABLE_PATH` in your .env

### Client Not Ready
- Wait 10-15 seconds after scanning the QR code
- Check that you're scanning with the correct WhatsApp account
- Restart the service and re-scan if needed

### Messages Not Sending
- Verify the phone number format (should include country code)
- Check that the WhatsApp client is authenticated
- Look for error logs in the terminal

### Recognition Issues
The button response parser is flexible:
- Accepts numbers (1, 2, 3, etc.)
- Accepts full labels (English, Rice, Create New Listing)
- Accepts partial matches (En → English, CR → Create)
- Case-insensitive

## API Endpoints

While the WhatsApp integration is event-driven, you can use these exported functions:

```javascript
// In your routes
const whatsapp = require('./utils/whatsapp.final');

// Send a custom message
await whatsapp.sendWhatsAppMessage({
  to: '+919876543210',
  body: 'Your listing is live!'
});

// Check if ready
if (whatsapp.isReady()) {
  console.log('WhatsApp is ready');
}

// Get QR code for authentication
const qr = whatsapp.getQrCode();

// Send notifications
await whatsapp.notifyFarmerNewBid(phone, amount, qty, city);
await whatsapp.notifyFarmerDealLocked(phone, listingId, buyerDetails);
await whatsapp.notifyFarmerPaymentSent(phone, amount, upiId);
```

## Performance Considerations

- **Memory**: The farmerStore and listingStore are in-memory. For production, consider persisting to MongoDB
- **Rate Limiting**: WhatsApp has message rate limits. The system includes small delays between messages
- **Concurrency**: The system handles multiple farmers simultaneously

## Security Notes

- Aadhaar numbers are hashed before storage
- Phone numbers are normalized and validated
- UPI IDs are not stored in plain text in logs
- Session data is stored locally in `.wwebjs_auth`

## Future Enhancements

Potential improvements:
- WhatsApp official API integration for true interactive buttons
- Rich media support (images in menus)
- Quick reply buttons for faster selection
- Message templates
- Automated backup of listings
- Integration with farmers' profiles API

## Support

For issues, check:
1. Terminal logs for errors
2. `.wwebjs_auth/session-farmbid-whatsapp` for session data
3. Console output for state transitions

## References

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [WhatsApp Official API](https://www.whatsapp.com/business/api/)
- [FarmBid Backend README](./README.md)
