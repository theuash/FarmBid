const messages = {
  en: {
    welcome: "👋 Namaste! Welcome to FarmBid 🌾\n\nYour transparent, blockchain-powered marketplace where farmers set the price and buyers compete fairly. We help you get the best value for your hard work with secure, direct payments.\n\nTo get started, please select your language:\nReply 1 for English\nReply 2 for ಕನ್ನಡ (Kannada)",
    select_role: "Are you a:\n1. Farmer (Seller)\n2. Buyer (Bidder)\n\nReply with number.",
    farmer_menu: "Farmer Menu:\n1. Register (KYC)\n2. Create Listing\n3. View My Listings\n4. Profile Details\n\nReply 'BACK' at any time to return to previous step.",
    buyer_menu: "Buyer Menu:\n1. Browse Auctions\n2. My Active Bids\n3. Wallet Balance\n\nReply 'BACK' to return.",
    reg_name: "Please enter your full name for registration.\n\n(Reply 'BACK' to return to menu)",
    reg_upi: "Great! Now enter your UPI ID (e.g., name@okicici) for payments.\n\n(Reply 'BACK' to edit name)",
    reg_success: "Registration successful! You are now a registered FarmBid Farmer.",
    listing_crop: "What crop would you like to list? (e.g., Rice, Onion, Tomato)\n\n(Reply 'BACK' to return to menu)",
    listing_quantity: "What is the total quantity? (Enter number in kg)\n\n(Reply 'BACK' to change crop)",
    listing_price: "What is your minimum expected price per kg (₹)?\n\n(Reply 'BACK' to change quantity)",
    listing_location: "Please enter your location or village name.\n\n(Reply 'BACK' to change price)",
    listing_photo: "Almost done! Please send a photo of your produce now, or reply 'NO' to skip.\n\n(Reply 'BACK' to change location)",
    listing_confirm_ai: "Review details:\nProduce: {produce}\nQty: {qty}{unit}\nPrice: ₹{price}/kg\nLoc: {loc}\n\nReply YES to confirm or NO to redo.",
    listing_success: "🎉 Congratulations! Your crop data added successfully to bidding. \n\nListing ID: {id}.\n\n(Reply 'MENU' to return)",
    invalid_input: "Invalid response. Please try again or reply 'HI' to start over.",
    connection_error: "Service temporarily unavailable. Please try again later."
  },
  kn: {
    welcome: "👋 ನಮಸ್ಕಾರ! ಫಾರ್ಮ್‌ಬಿಡ್‌ಗೆ ಸ್ವಾಗತ 🌾\n\nರೈತರು ಬೆಲೆ ನಿಗದಿಪಡಿಸುವ ಮತ್ತು ಖರೀದಿದಾರರು ಪಾರದರ್ಶಕವಾಗಿ ಸ್ಪರ್ಧಿಸುವ ಬ್ಲಾಕ್‌ಚೈನ್ ಆಧಾರಿತ ಮಾರುಕಟ್ಟೆ. ನಿಮ್ಮ ಕಠಿಣ ಪರಿಶ್ರಮಕ್ಕೆ ಉತ್ತಮ ಮೌಲ್ಯ ಮತ್ತು ಸುರಕ್ಷಿತ ಪಾವತಿಯನ್ನು ಪಡೆಯಲು ನಾವು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ.\n\nಪ್ರಾರಂಭಿಸಲು, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ:\nEnglish ಗಾಗಿ 1 ಎಂದು ಉತ್ತರಿಸಿ\nಕನ್ನಡಕ್ಕಾಗಿ 2 ಎಂದು ಉತ್ತರಿಸಿ",
    select_role: "ನೀವು:\n1. ರೈತ (ಮಾರಾಟಗಾರ)\n2. ಖರೀದಿದಾರ (ಬಿಡ್ಡರ್)\n\nಸಂಖ್ಯೆಯೊಂದಿಗೆ ಉತ್ತರಿಸಿ.",
    farmer_menu: "ರೈತರ ಮೆನು:\n1. ನೋಂದಣಿ (KYC)\n2. ಹೊಸ ಲಿಸ್ಟಿಂಗ್ ಮಾಡಿ\n3. ನನ್ನ ಲಿಸ್ಟಿಂಗ್‌ಗಳು\n4. ಪ್ರೊಫೈಲ್ ಮಾಹಿತಿ\n\nಹಿಂದಕ್ಕೆ ಹೋಗಲು ಯಾವ ಸಮಯದಲ್ಲೂ 'BACK' ಎಂದು ಉತ್ತರಿಸಿ.",
    buyer_menu: "ಖರೀದಿದಾರರ ಮೆನು:\n1. ಹರಾಜುಗಳನ್ನು ನೋಡಿ\n2. ನನ್ನ ಬಿಡ್‌ಗಳು\n3. ವ್ಯಾಲೆಟ್ ಬಾಕಿ\n\nಹಿಂದಕ್ಕೆ ಹೋಗಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ.",
    reg_name: "ನೋಂದಣಿಗಾಗಿ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.\n\n(ಮೆನುಗೆ ಹಿಂತಿರುಗಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    reg_upi: "ಉತ್ತಮ! ಈಗ ಪಾವತಿಗಳಿಗಾಗಿ ನಿಮ್ಮ UPI ID (ಉದಾ: name@okicici) ನಮೂದಿಸಿ.\n\n(ಹೆಸರು ಬದಲಾಯಿಸಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    reg_success: "ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ನೀವು ಈಗ ಫಾರ್ಮ್‌ಬಿಡ್ ರೈತರಾಗಿದ್ದೀರಿ.",
    listing_crop: "ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? (ಉದಾ: ಅಕ್ಕಿ, ಈರುಳ್ಳಿ, ಟೊಮೆಟೊ)\n\n(ಮೆನುಗೆ ಹಿಂತಿರುಗಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    listing_quantity: "ಒಟ್ಟು ಪ್ರಮಾಣ ಎಷ್ಟು? (ಕೆಜಿಯಲ್ಲಿ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ)\n\n(ಬೆಳೆ ಬದಲಾಯಿಸಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    listing_price: "ಪ್ರತಿ ಕೆಜಿಗೆ ನಿಮ್ಮ ಕನಿಷ್ಠ ನಿರೀಕ್ಷಿತ ಬೆಲೆ (₹) ಎಷ್ಟು?\n\n(ಪ್ರಮಾಣ ಬದಲಾಯಿಸಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    listing_location: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸ್ಥಳ ಅಥವಾ ಗ್ರಾಮದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.\n\n(ಬೆಲೆ ಬದಲಾಯಿಸಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    listing_photo: "ಲಿಸ್ಟಿಂಗ್ ಮುಗಿಸಲು ದಯವಿಟ್ಟು ಈಗ ಬೆಳಯ ಫೋಟೋ ಕಳುಹಿಸಿ, ಫೋಟೋ ಬೇಡವೆಂದರೆ 'NO' ಎಂದು ಉತ್ತರಿಸಿ.\n\n(ಸ್ಥಳ ಬದಲಾಯಿಸಲು 'BACK' ಎಂದು ಉತ್ತರಿಸಿ)",
    listing_confirm_ai: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ:\nಬೆಳೆ: {produce}\nಪ್ರಮಾಣ: {qty}{unit}\nಬೆಲೆ: ₹{price}/kg\nಸ್ಥಳ: {loc}\n\nದೃಢೀಕರಿಸಲು YES ಅಥವಾ ತಿದ್ದುಪಡಿ ಮಾಡಲು NO ಎಂದು ಉತ್ತರಿಸಿ.",
    listing_success: "🎉 ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಬೆಳೆ ಮಾಹಿತಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಹರಾಜಿಗೆ ಸೇರಿಸಲಾಗಿದೆ.\n\nಲಿಸ್ಟಿಂಗ್ ID: {id}.\n\n(ಮೆನುಗೆ ಹಿಂತಿರುಗಲು 'HI' ಎಂದು ಉತ್ತರಿಸಿ)",
    invalid_input: "ಅಮಾನ್ಯ ಪ್ರತಿಕ್ರಿಯೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಮೊದಲಿಂದ ಪ್ರಾರಂಭಿಸಲು 'HI' ಎಂದು ಉತ್ತರಿಸಿ.",
    connection_error: "ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ."
  }
};

module.exports = messages;
