// Test loading whatsapp.final.js via require
try {
  // Mock the dependencies so we don't need them installed
  const Module = require('module');
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'whatsapp-web.js') return { Client: class{}, LocalAuth: class{} };
    if (request === 'qrcode-terminal') return { generate: ()=>{} };
    if (request === './mockAPIs') return { verifyAadhaar:()=>{}, verifyOTP:()=>{}, verifyUPI:()=>{}, createListing:()=>{} };
    if (request === './whatsappInteractive') return require('./backend/utils/whatsappInteractive');
    return originalLoad.apply(this, arguments);
  };
  require('./backend/utils/whatsapp.final.js');
  process.stdout.write('LOAD OK\n');
} catch(e) {
  process.stdout.write('LOAD FAIL: ' + e.message + '\n');
  if (e.stack) process.stdout.write(e.stack.split('\n').slice(0,5).join('\n') + '\n');
}
