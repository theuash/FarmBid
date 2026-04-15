'use strict';

// WhatsApp numbered-text menu builder
// Works on any WhatsApp account (no Business API needed)

function buildMenu(header, body, options, footer) {
  var lines = [];
  if (header) lines.push(header);
  if (body) { lines.push(''); lines.push(body); }
  lines.push('');
  for (var i = 0; i < options.length; i++) {
    lines.push((i + 1) + '. ' + options[i]);
  }
  if (footer) lines.push('\n_' + footer + '_');
  return lines.join('\n');
}

function createLanguageMenu() {
  return buildMenu(
    'Welcome to FARM BID!',
    'Please choose your language / \u0cad\u0cbe\u0cb7\u0cc6 \u0c86\u0caf\u0ccd\u0c95\u0cc6 \u0cae\u0cbe\u0ca1\u0cbf',
    ['English', '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1'],
    'Reply 1 or 2'
  );
}

function createMainMenu(name, lang) {
  if (lang === 'kn') {
    return buildMenu(
      '\u0cb8\u0ccd\u0cb5\u0cbe\u0c97\u0ca4, ' + name + '!',
      '\u0c87\u0c82\u0ca6\u0cc1 \u0ca8\u0cc0\u0cb5\u0cc1 \u0c8f\u0ca8\u0cc1 \u0cae\u0cbe\u0ca1\u0cb2\u0cc1 \u0cac\u0caf\u0cb8\u0cc1\u0ca4\u0ccd\u0ca4\u0cc0\u0cb0\u0cbf? \u0c95\u0cc6\u0cb3\u0c97\u0cbf\u0ca8 \u0c86\u0caf\u0ccd\u0c95\u0cc6 \u0c86\u0cb0\u0cbf\u0cb8\u0cbf',
      [
        '\u0caa\u0c9f\u0ccd\u0c9f\u0cbf \u0cb0\u0c9a\u0cbf\u0cb8\u0cbf',
        '\u0ca8\u0ca8\u0ccd\u0ca8 \u0caa\u0c9f\u0ccd\u0c9f\u0cbf\u0c97\u0cb3\u0cc1',
        '\u0ca8\u0ca8\u0ccd\u0ca8 \u0ca8\u0c82\u0cac\u0cbf\u0c95\u0cc6 \u0c85\u0c82\u0c95',
        '\u0cb8\u0cbe\u0cae\u0cbe\u0ca8\u0ccd\u0caf \u0caa\u0ccd\u0cb0\u0cb6\u0ccd\u0ca8\u0cc6\u0c97\u0cb3\u0cc1',
        '\u0cb8\u0cb9\u0cbe\u0caf \u0cb8\u0c82\u0caa\u0cb0\u0ccd\u0c95'
      ],
      '1-5 \u0cb8\u0c82\u0c96\u0ccd\u0caf\u0cc6 \u0c89\u0ca4\u0ccd\u0ca4\u0cb0\u0cbf\u0cb8\u0cbf'
    );
  }
  return buildMenu(
    'Hello, ' + name + '!',
    'What would you like to do today? Choose an option below',
    [
      'Create Listing',
      'My Listings',
      'My Trust Score',
      'FAQ & Help',
      'Contact Support'
    ],
    'Reply with a number 1-5'
  );
}

function createProduceMenu(lang) {
  if (lang === 'kn') {
    return buildMenu(
      '\u0cb9\u0c82\u0ca4 2/5 - \u0ca8\u0cc0\u0cb5\u0cc1 \u0c8f\u0ca8\u0cc1 \u0cae\u0cbe\u0cb0\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0ca6\u0ccd\u0ca6\u0cc0\u0cb0\u0cbf?',
      '\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0cac\u0cc6\u0cb3\u0cc6 \u0c86\u0caf\u0ccd\u0c95\u0cc6 \u0cae\u0cbe\u0ca1\u0cbf',
      [
        '\u0cad\u0ca4\u0ccd\u0ca4 / \u0c85\u0c95\u0ccd\u0c95\u0cbf',
        '\u0c97\u0ccb\u0ca7\u0cbf',
        '\u0c9c\u0ccb\u0cb3',
        '\u0cb0\u0cbe\u0c97\u0cbf',
        '\u0c95\u0cac\u0ccd\u0cac\u0cc1',
        '\u0cb9\u0ca4\u0ccd\u0ca4\u0cbf',
        '\u0c9f\u0ccb\u0cae\u0cc7\u0c9f\u0ccb',
        '\u0c88\u0cb0\u0cc1\u0cb3\u0ccd\u0cb3\u0cbf',
        '\u0c87\u0ca4\u0cb0 (\u0cb9\u0cc6\u0cb8\u0cb0\u0cc1 \u0c9f\u0cc8\u0caa\u0ccd \u0cae\u0cbe\u0ca1\u0cbf)'
      ],
      '1-9 \u0cb8\u0c82\u0c96\u0ccd\u0caf\u0cc6 \u0c89\u0ca4\u0ccd\u0ca4\u0cb0\u0cbf\u0cb8\u0cbf'
    );
  }
  return buildMenu(
    'Step 2 of 5 - What are you selling?',
    'Select your produce',
    [
      'Rice / Paddy',
      'Wheat',
      'Corn / Maize',
      'Ragi (Millet)',
      'Sugarcane',
      'Cotton',
      'Tomato',
      'Onion',
      'Other (type the name)'
    ],
    'Reply with a number 1-9'
  );
}

function createConfirmMenu(details, lang) {
  if (lang === 'kn') {
    return buildMenu(
      '\u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0ca6\u0cc3\u0ca2\u0cc0\u0c95\u0cb0\u0cbf\u0cb8\u0cbf:',
      details,
      ['\u0cb9\u0ccc\u0ca6\u0cc1, \u0ca6\u0cc3\u0ca2\u0cc0\u0c95\u0cb0\u0cbf\u0cb8\u0cbf', '\u0c87\u0cb2\u0ccd\u0cb2, \u0cb0\u0ca6\u0ccd\u0ca6\u0cc1'],
      '1 \u0ca6\u0cc3\u0ca2\u0cc0\u0c95\u0cb0\u0cbf\u0cb8\u0cb2\u0cc1, 2 \u0cb0\u0ca6\u0ccd\u0ca6\u0cc1 \u0cae\u0cbe\u0ca1\u0cb2\u0cc1'
    );
  }
  return buildMenu(
    'Please confirm your listing:',
    details,
    ['Yes, Confirm', 'No, Cancel'],
    'Reply 1 to confirm or 2 to cancel'
  );
}

function createUnknownMenu(lang) {
  if (lang === 'kn') {
    return '\u0c95\u0ccd\u0cb7\u0cae\u0cbf\u0cb8\u0cbf, \u0ca8\u0ca8\u0c97\u0cc6 \u0c85\u0cb0\u0ccd\u0ca5\u0cb5\u0cbe\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cb8\u0c82\u0c96\u0ccd\u0caf\u0cc6 \u0c89\u0ca4\u0ccd\u0ca4\u0cb0\u0cbf\u0cb8\u0cbf.';
  }
  return 'Sorry, I did not understand that. Please reply with a number from the menu.';
}

// Maps farmer reply to an action key
// context: 'language' | 'main' | 'produce' | 'confirm'
function parseReply(input, context) {
  var raw = (input || '').trim();
  var t = raw.toLowerCase();

  if (context === 'language') {
    if (raw === '1' || t === 'english' || t === 'en') return 'lang_en';
    if (raw === '2' || t.indexOf('\u0c95\u0ca8\u0ccd\u0ca8\u0ca1') >= 0 || t === 'kn') return 'lang_kn';
    return null;
  }

  if (context === 'main') {
    if (raw === '1' || t.indexOf('create') >= 0 || t.indexOf('\u0caa\u0c9f\u0ccd\u0c9f\u0cbf \u0cb0\u0c9a\u0cbf') >= 0) return 'create_listing';
    if (raw === '2' || t.indexOf('my listing') >= 0 || t.indexOf('\u0ca8\u0ca8\u0ccd\u0ca8 \u0caa\u0c9f\u0ccd\u0c9f\u0cbf') >= 0) return 'my_listings';
    if (raw === '3' || t.indexOf('trust') >= 0 || t.indexOf('\u0ca8\u0c82\u0cac\u0cbf\u0c95\u0cc6') >= 0) return 'trust_score';
    if (raw === '4' || t.indexOf('faq') >= 0 || t.indexOf('help') >= 0 || t.indexOf('\u0caa\u0ccd\u0cb0\u0cb6\u0ccd\u0ca8') >= 0) return 'faq';
    if (raw === '5' || t.indexOf('support') >= 0 || t.indexOf('\u0cb8\u0cb9\u0cbe\u0caf') >= 0) return 'support';
    return null;
  }

  if (context === 'produce') {
    var produceMap = {
      '1': 'rice', '2': 'wheat', '3': 'corn', '4': 'ragi',
      '5': 'sugarcane', '6': 'cotton', '7': 'tomato', '8': 'onion', '9': 'other'
    };
    if (produceMap[raw]) return 'produce_' + produceMap[raw];
    if (t.indexOf('rice') >= 0 || t.indexOf('paddy') >= 0 || t.indexOf('\u0cad\u0ca4\u0ccd\u0ca4') >= 0 || t.indexOf('\u0c85\u0c95\u0ccd\u0c95\u0cbf') >= 0) return 'produce_rice';
    if (t.indexOf('wheat') >= 0 || t.indexOf('\u0c97\u0ccb\u0ca7\u0cbf') >= 0) return 'produce_wheat';
    if (t.indexOf('corn') >= 0 || t.indexOf('maize') >= 0 || t.indexOf('\u0c9c\u0ccb\u0cb3') >= 0) return 'produce_corn';
    if (t.indexOf('ragi') >= 0 || t.indexOf('millet') >= 0 || t.indexOf('\u0cb0\u0cbe\u0c97\u0cbf') >= 0) return 'produce_ragi';
    if (t.indexOf('sugarcane') >= 0 || t.indexOf('\u0c95\u0cac\u0ccd\u0cac\u0cc1') >= 0) return 'produce_sugarcane';
    if (t.indexOf('cotton') >= 0 || t.indexOf('\u0cb9\u0ca4\u0ccd\u0ca4\u0cbf') >= 0) return 'produce_cotton';
    if (t.indexOf('tomato') >= 0 || t.indexOf('\u0c9f\u0ccb\u0cae\u0cc7\u0c9f\u0ccb') >= 0) return 'produce_tomato';
    if (t.indexOf('onion') >= 0 || t.indexOf('\u0c88\u0cb0\u0cc1\u0cb3\u0ccd\u0cb3\u0cbf') >= 0) return 'produce_onion';
    if (t.indexOf('other') >= 0 || t.indexOf('\u0c87\u0ca4\u0cb0') >= 0) return 'produce_other';
    return null;
  }

  if (context === 'confirm') {
    if (raw === '1' || t.indexOf('yes') >= 0 || t.indexOf('confirm') >= 0 || t.indexOf('\u0cb9\u0ccc\u0ca6\u0cc1') >= 0) return 'confirm';
    if (raw === '2' || t.indexOf('no') >= 0 || t.indexOf('cancel') >= 0 || t.indexOf('\u0c87\u0cb2\u0ccd\u0cb2') >= 0 || t.indexOf('\u0cb0\u0ca6\u0ccd\u0ca6\u0cc1') >= 0) return 'cancel';
    return null;
  }

  return null;
}

module.exports = {
  buildMenu: buildMenu,
  createLanguageMenu: createLanguageMenu,
  createMainMenu: createMainMenu,
  createProduceMenu: createProduceMenu,
  createConfirmMenu: createConfirmMenu,
  createUnknownMenu: createUnknownMenu,
  parseReply: parseReply
};
