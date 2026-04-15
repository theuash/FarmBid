# WhatsApp Integration - Testing Guide & Scenarios

## Quick Start Testing

### 1. Initial Setup
```bash
cd backend
npm install
npm start
```

You should see:
```
[WhatsApp] Client initialization started...
📱 [WhatsApp] QR Code received. Scan with your phone:
```

### 2. Scan QR Code
- Open WhatsApp on your phone
- Scan the QR code shown in terminal
- Wait 10-15 seconds for authentication

You should see:
```
✅ WhatsApp client authenticated successfully.
✅ WhatsApp client is ready.
```

---

## Test Scenario 1: English Registration Flow

### User sends: `hi`
**Bot Response:**
```
🌍 SELECT YOUR LANGUAGE

Welcome to FarmBid! Please choose your preferred language.

🇬🇧 1. English
🇮🇳 2. ಕನ್ನಡ

_Reply with the number (1, 2, 3...) or the option name_
```

### User sends: `1` (or `english` or `en`)
**Bot Response:**
```
👨‍🌾 WELCOME TO FARMBID

Are you a farmer looking to sell your produce at fair prices?

✅ 1. Yes, I am a Farmer
❌ 2. No, I am a Buyer

_Reply with the number (1, 2, 3...) or the option name_
```

### User sends: `yes` (or `1` or `yes, i am a farmer`)
**Bot Response:**
```
📋 Please send your 12-digit Aadhaar number to verify your identity.
```

### User sends: `123456789012`
**Bot Response:**
```
✅ Aadhaar verified!

👋 Welcome John Doe.

📱 Please send the 6-digit OTP sent to your registered mobile number.
```

### User sends: `123456` (mock OTP)
**Bot Response:**
```
✅ Identity verified!

💳 Now, please send your UPI ID for payments.

Example: yourname@upi
```

### User sends: `john@upi` (or similar valid UPI format)
**Bot Response:**
```
🏠 MAIN MENU

Welcome back, John Doe! What would you like to do today?

📸 1. Create New Listing
📋 2. View Active Listings
⭐ 3. View My Trust Score
🎯 4. More Services

_Reply with the number (1, 2, 3...) or the option name_
```

---

## Test Scenario 2: Create a Listing

### User sends: `1` (Create New Listing)
**Bot Response:**
```
📦 WHAT ARE YOU SELLING?

Select the produce you want to list:

🍚 1. Rice
🌾 2. Wheat
🌽 3. Corn
🌾 4. Sugarcane
🤍 5. Cotton
📝 6. Other/Custom

_Reply with the number (1, 2, 3...) or the option name_
```

### User sends: `1` (Rice)
**Bot Response:**
```
📋 LISTING CREATION PROGRESS

✅ 1. Photo
⭕ 2. Weight
⭕ 3. Price
⭕ 4. Harvest Date

📸 Please send a clear photo of your produce.
```

### User sends: [Image file]
**Bot Response:**
```
📋 LISTING CREATION PROGRESS

✅ 1. Photo
⚖️ 2. Weight ← You are here
⭕ 3. Price
⭕ 4. Harvest Date

⚖️ Now send the total weight in kg.

_Example: 100_
```

### User sends: `500`
**Bot Response:**
```
📋 LISTING CREATION PROGRESS

✅ 1. Photo
✅ 2. Weight
💰 3. Price ← You are here
⭕ 4. Harvest Date

💰 What is your minimum price per kg?

_Example: 40_
```

### User sends: `35`
**Bot Response:**
```
📋 LISTING CREATION PROGRESS

✅ 1. Photo
✅ 2. Weight
✅ 3. Price
📅 4. Harvest Date ← You are here

📅 When will the produce be ready for pickup?

_Send date as DD-MM-YYYY
Example: 15-04-2026_
```

### User sends: `20-04-2026`
**Bot Response:**
```
🎉 LISTING CREATED SUCCESSFULLY!

🔹 Listing ID: LIST123456
🔹 Produce: Rice
🔹 Weight: 500kg
🔹 Min Price: ₹35/kg

✅ Buyers are being notified!
_Auction closes at: 2026-04-20 18:30:00_
```

Then shows main menu again.

---

## Test Scenario 3: Kannada Interaction

### User sends: `namaskara` (Kannada for hello)
**Bot Response:**
```
🌍 ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ

FarmBid ಗೆ ಸ್ವಾಗತ! ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.

🇬🇧 1. English
🇮🇳 2. ಕನ್ನಡ

_ಸಂಖ್ಯೆ (1, 2, 3...) ಅಥವಾ ಆಯ್ಕೆ ಹೆಸರಿನೊಂದಿಗೆ ಉತ್ತರ ಕಳುಹಿಸಿ_
```

### User sends: `2` (or `kannada`)
**Bot Response:**
```
👨‍🌾 FARMBID ಗೆ ಸ್ವಾಗತ

ನೀವು ನಿಮ್ಮ ಹೆಗಲುವನ್ನು ನ್ಯಾಯಯುತ ಬೆಲೆಯಲ್ಲಿ ಮಾರಲು ಬಯಸುವ ರೈತರೀ?

✅ 1. ಹೌದು, ನಾನು ರೈತ
❌ 2. ಇಲ್ಲ, ನಾನು ಖರೀದಿದಾರ

_ಸಂಖ್ಯೆ (1, 2, 3...) ಅಥವಾ ಆಯ್ಕೆ ಹೆಸರಿನೊಂದಿಗೆ ಉತ್ತರ ಕಳುಹಿಸಿ_
```

All subsequent messages will be in Kannada.

---

## Test Scenario 4: View Active Listings

### From main menu, user sends: `2`
**Bot Response:**
```
📭 You have no active listings right now.

_Reply 1 to create a new listing._
```

Or if there are listings:
```
📋 YOUR ACTIVE LISTINGS

🔹 ID: LIST001
🔹 Weight: 500kg
🔹 Min Price: ₹35/kg

🔹 ID: LIST002
🔹 Weight: 250kg
🔹 Min Price: ₹45/kg
```

---

## Test Scenario 5: View Trust Score

### From main menu, user sends: `3`
**Bot Response:**
```
⭐ YOUR TRUST SCORE

Score: 100/100

Your trust score reflects your reliability on FarmBid.
```

Then shows main menu again.

---

## Test Scenario 6: More Services Menu

### From main menu, user sends: `4`
**Bot Response:**
```
🎯 MORE SERVICES

What service do you need help with?

❓ 1. FAQ & Help
📞 2. Contact Support
📄 3. Terms & Conditions
🔙 4. Back to Menu

_Reply with the number (1, 2, 3...) or the option name_
```

---

## Input Variations Testing

Test that these all work for the same option:

### For English option (should all work)
- `1` - Number
- `english` - Full word
- `English` - Capitalized
- `en` - Shorthand
- `EN` - Uppercase shorthand
- `1. english` - With period
- `ENGLISH` - All caps

### For Create New Listing option
- `1`
- `create new listing`
- `create`
- `CR`
- `creat`

### For Rice produce
- `1`
- `rice`
- `Rice`
- `ri`
- `RICE`

---

## Error Handling Testing

### Test 1: Invalid Aadhaar
```
User: 12345 (too short)
Bot: ⚠️ Aadhaar must be 12 digits. Please send your 12-digit Aadhaar number.
```

### Test 2: Invalid OTP
```
User: 12345 (too short)
Bot: ⚠️ OTP must be 6 digits. Please send the OTP again.
```

### Test 3: Invalid UPI
```
User: notvalid
Bot: ⚠️ Invalid UPI format. Please send your UPI ID like yourname@upi.
```

### Test 4: Invalid Weight
```
User: abc
Bot: ⚠️ Weight must be a number. Please send the weight in kg.
     Example: 100
```

### Test 5: Invalid Date
```
User: 32-13-2026
Bot: ❌ The date you sent is invalid. Please send harvest date as DD-MM-YYYY.
```

### Test 6: Unrecognized Input
```
User: xyz123
Bot: ❓ Sorry, I did not understand that. Please follow the current prompt or type 1 to return to the main menu.
```

---

## Performance Testing

### Test Rapid Messaging
Send messages quickly in succession to ensure:
- No crashes
- No skipped messages
- Proper state transitions
- Correct responses

### Test Simultaneous Users
Start multiple test sessions with different phone numbers to verify:
- Each farmer has isolated state
- No data cross-contamination
- Memory usage stays reasonable

### Test Long Sessions
Keep one session open for extended time to verify:
- No memory leaks
- Session stays authenticated
- Can navigate to different menus repeatedly

---

## Debugging Tips

### Check Logs
```bash
# Run with verbose output
NODE_DEBUG=* npm start

# Check specific logs
grep "state transition" logs.txt
grep "ERROR" logs.txt
```

### Monitor State Changes
Look for logs like:
```
[WhatsApp] +919876543210 state transition 0 -> 0.5
[WhatsApp] +919876543210 state transition 0.5 -> 0.75
[WhatsApp] +919876543210 state transition 0.75 -> 1
```

### Inspect Farmer Data
Add this to your code to log farmer data:
```javascript
console.log('[DEBUG] Farmer data:', JSON.stringify(farmer, null, 2));
```

---

## Automated Test Script (Optional)

If you want to automate testing, you could create a test script that:
1. Connects to WhatsApp Web API
2. Sends predefined messages
3. Validates responses
4. Logs results

Example tools:
- whatsapp-web.js test utilities
- Selenium for browser automation
- Custom Node.js test harness

---

## Troubleshooting Checklist

- [ ] QR code displays
- [ ] QR code scans successfully  
- [ ] "Client ready" message appears
- [ ] Messages are received
- [ ] Menus display with proper formatting
- [ ] Button responses are recognized
- [ ] Language selection works
- [ ] Aadhaar verification works
- [ ] OTP verification works
- [ ] UPI verification works
- [ ] Main menu displays
- [ ] Can create listings
- [ ] Can view listings
- [ ] Can view trust score
- [ ] Can access more services
- [ ] Kannada text displays correctly
- [ ] Error messages work
- [ ] Session persists across messages

---

## What to Check If Something Goes Wrong

1. **No QR Code**: Chrome/Chromium issue
   - Install: `sudo apt-get install chromium-browser`
   - Set: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

2. **Client Not Ready**: Authentication issue
   - Wait 15 seconds
   - Clear `.wwebjs_auth` directory
   - Rescan QR code

3. **Wrong Language Messages**: Language encoding issue
   - Check terminal UTF-8 encoding
   - Verify Node.js version (12+)

4. **State Doesn't Progress**: Message parsing issue
   - Check logs for parsing errors
   - Try different input format
   - Verify farmer data in memory

---

## Success Criteria

A successful test should show:
- ✅ User can select language
- ✅ User can register with Aadhaar/OTP/UPI
- ✅ User can see main menu
- ✅ User can create a listing
- ✅ User can view listings
- ✅ User can see trust score
- ✅ All messages are properly formatted
- ✅ No crashes or errors in logs
- ✅ Response time < 2 seconds
- ✅ Button parsing works for multiple input formats
