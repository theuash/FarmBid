/**
 * WhatsApp Interactive Messaging System
 * Provides button-based and menu-based interactions for farmers
 * Built on top of whatsapp-web.js
 */

const { MessageMedia } = require('whatsapp-web.js');

/**
 * Create a formatted button menu message with arrow-style buttons
 * @param {string} title - Menu title
 * @param {Array<{id: string, label: string}>} buttons - Button options
 * @returns {string} - Formatted message text
 */
const createArrowMenu = (title, buttons) => {
  let formatted = `${title}\n\n`;
  buttons.forEach((btn) => {
    formatted += `← ${btn.label}\n`;
  });
  return formatted;
};

/**
 * Create a formatted button menu message (legacy - with numbers)
 * @param {string} title - Menu title
 * @param {string} message - Main message body
 * @param {Array<{id: string, label: string, icon: string}>} buttons - Button options
 * @returns {string} - Formatted message text
 */
const createButtonMenu = (title, message, buttons) => {
  let formatted = `${title}\n\n${message}\n\n`;
  
  buttons.forEach((btn, index) => {
    formatted += `${btn.icon} ${index + 1}. ${btn.label}\n`;
  });
  
  formatted += `\n_Reply with the number (1, 2, 3...) or the option name_`;
  return formatted;
};

/**
 * Create a language selection menu
 * @returns {object} - Message and button mapping
 */
const createLanguageMenu = () => {
  const buttons = [
    { id: 'en', label: 'English' },
    { id: 'kn', label: 'ಕನ್ನಡ' }
  ];

  const message = createArrowMenu('SELECT YOUR LANGUAGE', buttons);

  return { message, buttons };
};

/**
 * Create main menu for registered farmers
 * @param {string} name - Farmer name
 * @returns {object} - Message and button mapping
 */
const createMainMenu = (name, language = 'en') => {
  const menus = {
    en: {
      greeting: `Welcome back, ${name}!`,
      buttons: [
        { id: '1', label: 'Create New Listing' },
        { id: '2', label: 'View Active Listings' },
        { id: '3', label: 'View My Trust Score' },
        { id: '4', label: 'Settings' }
      ]
    },
    kn: {
      greeting: `ಸ್ವಾಗತ, ${name}!`,
      buttons: [
        { id: '1', label: 'ಹೊಸ ಪಟ್ಟಿ ರಚಿಸಿ' },
        { id: '2', label: 'ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ' },
        { id: '3', label: 'ನನ್ನ ನಂಬಿಕೆ ಅಂಕವನ್ನು ವೀಕ್ಷಿಸಿ' },
        { id: '4', label: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು' }
      ]
    }
  };

  const menu = menus[language] || menus.en;
  const message = `${menu.greeting}\n\n${createArrowMenu('MENU', menu.buttons)}`;

  return {
    message,
    buttons: menu.buttons
  };
};

/**
 * Create listing creation menu with produce options
 * @param {string} language - User's language preference
 * @returns {object} - Message and button mapping
 */
const createProduceSelectionMenu = (language = 'en') => {
  const menus = {
    en: {
      title: '📦 WHAT ARE YOU SELLING?',
      message: 'Select the produce you want to list:',
      buttons: [
        { id: 'rice', label: 'Rice', icon: '🍚' },
        { id: 'wheat', label: 'Wheat', icon: '🌾' },
        { id: 'corn', label: 'Corn', icon: '🌽' },
        { id: 'sugarcane', label: 'Sugarcane', icon: '🌾' },
        { id: 'cotton', label: 'Cotton', icon: '🤍' },
        { id: 'other', label: 'Other/Custom', icon: '📝' }
      ]
    },
    kn: {
      title: '📦 ನೀವು ಏನು ಮಾರುತ್ತಿದ್ದೀರಿ?',
      message: 'ನೀವು ಪಟ್ಟಿ ಮಾಡಲು ಬಯಸುವ ಪಂಜರವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:',
      buttons: [
        { id: 'rice', label: 'ಅವಳೆ', icon: '🍚' },
        { id: 'wheat', label: 'ಗೋಧಿ', icon: '🌾' },
        { id: 'corn', label: 'ಜೋಳ', icon: '🌽' },
        { id: 'sugarcane', label: 'ಕಿವಿ', icon: '🌾' },
        { id: 'cotton', label: 'ಪಟ್ಟು', icon: '🤍' },
        { id: 'other', label: 'ಇತರ', icon: '📝' }
      ]
    }
  };

  const menu = menus[language] || menus.en;
  const message = createButtonMenu(menu.title, menu.message, menu.buttons);

  return {
    message,
    buttons: menu.buttons
  };
};

/**
 * Create a confirmation menu
 * @param {string} title - Confirmation title
 * @param {string} details - Details to confirm
 * @param {string} language - Language
 * @returns {object} - Message and button mapping
 */
const createConfirmationMenu = (title, details, language = 'en') => {
  const menus = {
    en: {
      buttons: [
        { id: 'confirm', label: 'Yes, Confirm ✓', icon: '✅' },
        { id: 'cancel', label: 'No, Cancel ✗', icon: '❌' }
      ]
    },
    kn: {
      buttons: [
        { id: 'confirm', label: 'ಹೌದು, ಖಚಿತಪಡಿಸಿ ✓', icon: '✅' },
        { id: 'cancel', label: 'ಇಲ್ಲ, ರದ್ದುಮಾಡಿ ✗', icon: '❌' }
      ]
    }
  };

  const btns = menus[language]?.buttons || menus.en.buttons;
  const message = `${title}\n\n${details}\n\n`;
  
  btns.forEach((btn, index) => {
    message += `${btn.icon} *${index + 1}. ${btn.label}*\n`;
  });

  return {
    message,
    buttons: btns
  };
};

/**
 * Parse button response - maps user input to button ID
 * @param {string} input - User's text input
 * @param {Array} buttons - Available buttons
 * @returns {string|null} - Button ID or null if not found
 */
const parseButtonResponse = (input, buttons) => {
  const lower = input.toLowerCase().trim();
  const trimmed = lower.replace(/[^\w]/g, '');

  // Try to match by number (1, 2, 3, etc.)
  const numberMatch = input.match(/^[0-9]+$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[0]) - 1;
    if (index >= 0 && index < buttons.length) {
      return buttons[index].id;
    }
  }

  // Try to match by label
  for (const btn of buttons) {
    const btnLabel = btn.label.toLowerCase().replace(/[^\w]/g, '');
    const btnId = btn.id.toLowerCase().replace(/[^\w]/g, '');
    
    if (btnLabel.includes(trimmed) || trimmed.includes(btnLabel) || btnId === trimmed) {
      return btn.id;
    }
  }

  return null;
};

/**
 * Create a progress menu showing listing creation steps
 * @param {number} currentStep - Current step (1-4)
 * @param {string} language - Language
 * @returns {string} - Formatted progress message
 */
const createProgressMenu = (currentStep, language = 'en') => {
  const steps = {
    en: [
      { num: 1, name: 'Photo', emoji: '📸' },
      { num: 2, name: 'Weight', emoji: '⚖️' },
      { num: 3, name: 'Price', emoji: '💰' },
      { num: 4, name: 'Harvest Date', emoji: '📅' }
    ],
    kn: [
      { num: 1, name: 'ಫೋಟೋ', emoji: '📸' },
      { num: 2, name: 'ತೂಕ', emoji: '⚖️' },
      { num: 3, name: 'ಬೆಲೆ', emoji: '💰' },
      { num: 4, name: 'ಪುರವಾರ ದಿನಾಂಕ', emoji: '📅' }
    ]
  };

  const stepList = steps[language] || steps.en;
  let progress = '📋 *LISTING CREATION PROGRESS*\n\n';

  stepList.forEach((step) => {
    const isActive = step.num === currentStep;
    const isDone = step.num < currentStep;
    
    if (isDone) {
      progress += `✅ ${step.num}. ${step.name}\n`;
    } else if (isActive) {
      progress += `${step.emoji} *${step.num}. ${step.name}* ← You are here\n`;
    } else {
      progress += `⭕ ${step.num}. ${step.name}\n`;
    }
  });

  return progress;
};

/**
 * Create a services menu
 * @param {string} language - Language
 * @returns {object} - Message and button mapping
 */
const createServicesMenu = (language = 'en') => {
  const menus = {
    en: {
      title: '🎯 MORE SERVICES',
      message: 'What service do you need help with?',
      buttons: [
        { id: 'faq', label: 'FAQ & Help', icon: '❓' },
        { id: 'support', label: 'Contact Support', icon: '📞' },
        { id: 'terms', label: 'Terms & Conditions', icon: '📄' },
        { id: 'back', label: 'Back to Menu', icon: '🔙' }
      ]
    },
    kn: {
      title: '🎯 ಹೆಚ್ಚು ಸೇವೆಗಳು',
      message: 'ನೀವು ಯಾವ ಸೇವೆಯಲ್ಲಿ ಸಹಾಯ ಪಡೆಯಲು ಬಯಸುತ್ತೀರಿ?',
      buttons: [
        { id: 'faq', label: 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು', icon: '❓' },
        { id: 'support', label: 'ಸಹಾಯ ನಿಲುವು', icon: '📞' },
        { id: 'terms', label: 'ನಿಯಮ ಮತ್ತು ಷರತ್ತುಗಳು', icon: '📄' },
        { id: 'back', label: 'ಮೆನುಗೆ ಹಿಂತಿರುಗಿ', icon: '🔙' }
      ]
    }
  };

  const menu = menus[language] || menus.en;
  const message = createButtonMenu(menu.title, menu.message, menu.buttons);

  return {
    message,
    buttons: menu.buttons
  };
};

/**
 * Create a success message with next steps
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @param {Array} nextOptions - Next action buttons
 * @param {string} language - Language
 * @returns {object} - Message and button mapping
 */
const createSuccessMenu = (title, message, nextOptions = [], language = 'en') => {
  const fullMessage = `${title}\n\n${message}`;

  if (nextOptions.length === 0) {
    return { message: fullMessage, buttons: [] };
  }

  const buttons = nextOptions;
  let formatted = `${fullMessage}\n\n`;
  
  buttons.forEach((btn, index) => {
    formatted += `${btn.icon} *${index + 1}. ${btn.label}*\n`;
  });

  return {
    message: formatted,
    buttons
  };
};

module.exports = {
  createButtonMenu,
  createLanguageMenu,
  createMainMenu,
  createProduceSelectionMenu,
  createConfirmationMenu,
  createProgressMenu,
  createServicesMenu,
  createSuccessMenu,
  parseButtonResponse
};
