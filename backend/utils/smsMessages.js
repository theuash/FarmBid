const messages = {
  en: {
    welcome: "Welcome to FarmBid! The blockchain agricultural marketplace.\n\nReply 1 for English\nReply 2 for ಕನ್ನಡ (Kannada)",
    select_role: "Are you a:\n1. Farmer (Seller)\n2. Buyer (Bidder)\n\nReply with number.",
    farmer_menu: "Farmer Menu:\n1. Register (KYC)\n2. Create Listing\n3. View My Listings\n4. Profile Details",
    buyer_menu: "Buyer Menu:\n1. Browse Auctions\n2. My Active Bids\n3. Wallet Balance",
    reg_aadhaar: "Please enter your 12-digit Aadhaar number for verification.",
    reg_upi: "Great! Now enter your UPI ID (e.g., name@okicici) for payments.",
    reg_success: "Registration successful! You are now a verified FarmBid Farmer.",
    listing_crop: "What crop would you like to list? (e.g., Rice, Onion, Tomato)",
    listing_quantity: "What is the total quantity? (Enter number in kg)",
    listing_price: "What is your minimum expected price per kg (₹)?",
    listing_location: "Please enter your location or village name.",
    listing_photo: "Almost done! Please send a photo of your produce now, or reply NO to skip.",
    listing_confirm_ai: "I extracted these details:\nProduce: {produce}\nQty: {qty}{unit}\nPrice: ₹{price}/kg\nLoc: {loc}\n\nReply YES to confirm or NO to redo.",
    listing_success: "Listing is now LIVE! ID: {id}. Buyers will now start bidding.",
    invalid_input: "Invalid response. Please try again or reply MENU.",
    connection_error: "Service temporarily unavailable. Please try again later."
  },
  kn: {
    welcome: "ಫಾರ್ಮ್‌ಬಿಡ್‌ಗೆ ಸ್ವಾಗತ! ಬ್ಲಾಕ್‌ಚೈನ್ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ.\n\nEnglish ಗಾಗಿ 1 ಎಂದು ಉತ್ತರಿಸಿ\nಕನ್ನಡಕ್ಕಾಗಿ 2 ಎಂದು ಉತ್ತರಿಸಿ",
    select_role: "ನೀವು:\n1. ರೈತ (ಮಾರಾಟಗಾರ)\n2. ಖರೀದಿದಾರ (ಬಿಡ್ಡರ್)\n\nಸಂಖ್ಯೆಯೊಂದಿಗೆ ಉತ್ತರಿಸಿ.",
    farmer_menu: "ರೈತರ ಮೆನು:\n1. ನೋಂದಣಿ (KYC)\n2. ಹೊಸ ಲಿಸ್ಟಿಂಗ್ ಮಾಡಿ\n3. ನನ್ನ ಲಿಸ್ಟಿಂಗ್‌ಗಳು\n4. ಪ್ರೊಫೈಲ್ ಮಾಹಿತಿ",
    buyer_menu: "ಖರೀದಿದಾರರ ಮೆನು:\n1. ಹರಾಜುಗಳನ್ನು ನೋಡಿ\n2. ನನ್ನ ಬಿಡ್‌ಗಳು\n3. ವ್ಯಾಲೆಟ್ ಬಾಕಿ",
    reg_aadhaar: "ಪರಿಶೀಲನೆಗಾಗಿ ದಯವಿಟ್ಟು ನಿಮ್ಮ 12-ಅಂಕಿಗಳ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
    reg_upi: "ಉತ್ತಮ! ಈಗ ಪಾವತಿಗಳಿಗಾಗಿ ನಿಮ್ಮ UPI ID (ಉದಾ: name@okicici) ನಮೂದಿಸಿ.",
    reg_success: "ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ನೀವು ಈಗ ಫಾರ್ಮ್‌ಬಿಡ್ ದೃಢೀಕೃತ ರೈತರಾಗಿದ್ದೀರಿ.",
    listing_crop: "ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? (ಉದಾ: ಅಕ್ಕಿ, ಈರುಳ್ಳಿ, ಟೊಮೆಟೊ)",
    listing_quantity: "ಒಟ್ಟು ಪ್ರಮಾಣ ಎಷ್ಟು? (ಕೆಜಿಯಲ್ಲಿ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ)",
    listing_price: "ಪ್ರತಿ ಕೆಜಿಗೆ ನಿಮ್ಮ ಕನಿಷ್ಠ ನಿರೀಕ್ಷಿತ ಬೆಲೆ (₹) ಎಷ್ಟು?",
    listing_location: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳ ಅಥವಾ ಗ್ರಾಮದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
    listing_photo: "ಲಿಸ್ಟಿಂಗ್ ಮುಗಿಸಲು ದಯವಿಟ್ಟು ಈಗ ಬೆಳಯ ಫೋಟೋ ಕಳುಹಿಸಿ, ಫೋಟೋ ಬೇಡವೆಂದರೆ NO ಎಂದು ಉತ್ತರಿಸಿ.",
    listing_confirm_ai: "ನಾನು ಈ ವಿವರಗಳನ್ನು ಪಡೆದುಕೊಂಡಿದ್ದೇನೆ:\nಬೆಳೆ: {produce}\nಪ್ರಮಾಣ: {qty}{unit}\nಬೆಲೆ: ₹{price}/kg\nಸ್ಥಳ: {loc}\n\nದೃಢೀಕರಿಸಲು YES ಅಥವಾ ತಿದ್ದುಪಡಿ ಮಾಡಲು NO ಎಂದು ಉತ್ತರಿಸಿ.",
    listing_success: "ಲಿಸ್ಟಿಂಗ್ ಈಗ ಪ್ರಾರಂಭವಾಗಿದೆ! ID: {id}. ಖರೀದಿದಾರರು ಈಗ ಬಿಡ್ ಮಾಡಲು ಪ್ರಾರಂಭಿಸುತ್ತಾರೆ.",
    invalid_input: "ಅಮಾನ್ಯ ಪ್ರತಿಕ್ರಿಯೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ MENU ಎಂದು ಉತ್ತರಿಸಿ.",
    connection_error: "ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ."
  }
};

module.exports = messages;
