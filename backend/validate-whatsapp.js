#!/usr/bin/env node
/**
 * WhatsApp Integration Validation Script
 * Checks if all files are in place and dependencies are available
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FarmBid WhatsApp Integration Validation\n');

const checks = [];

// Check 1: whatsappInteractive.js exists
console.log('📋 Checking files...');
try {
  const interactivePath = path.join(__dirname, 'backend/utils/whatsappInteractive.js');
  if (fs.existsSync(interactivePath)) {
    checks.push({ name: 'whatsappInteractive.js', status: '✅' });
    console.log('  ✅ whatsappInteractive.js found');
  } else {
    checks.push({ name: 'whatsappInteractive.js', status: '❌' });
    console.log('  ❌ whatsappInteractive.js NOT found');
  }
} catch (e) {
  console.log('  ⚠️  Error checking whatsappInteractive.js:', e.message);
}

// Check 2: whatsapp.final.js exists
try {
  const whatsappPath = path.join(__dirname, 'backend/utils/whatsapp.final.js');
  if (fs.existsSync(whatsappPath)) {
    checks.push({ name: 'whatsapp.final.js', status: '✅' });
    console.log('  ✅ whatsapp.final.js found');
  } else {
    checks.push({ name: 'whatsapp.final.js', status: '❌' });
    console.log('  ❌ whatsapp.final.js NOT found');
  }
} catch (e) {
  console.log('  ⚠️  Error checking whatsapp.final.js:', e.message);
}

// Check 3: Dependencies
console.log('\n📦 Checking dependencies...');
const requiredDeps = [
  'whatsapp-web.js',
  'qrcode-terminal',
  'puppeteer',
  'express',
  'mongoose'
];

try {
  const packageJsonPath = path.join(__dirname, 'backend/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep} v${packageJson.dependencies[dep]}`);
    } else {
      console.log(`  ⚠️  ${dep} not found in package.json`);
    }
  });
} catch (e) {
  console.log('  ❌ Error reading package.json:', e.message);
}

// Check 4: Environment variables
console.log('\n🔐 Checking environment setup...');
try {
  require('dotenv').config();
  
  const sessionPath = process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth';
  console.log(`  📍 Session path: ${sessionPath}`);
  
  if (fs.existsSync(sessionPath)) {
    console.log(`  ✅ Session directory exists`);
  } else {
    console.log(`  ℹ️  Session directory will be created on first run`);
  }
} catch (e) {
  console.log('  ⚠️  Could not read environment:', e.message);
}

// Check 5: Module imports
console.log('\n🔗 Checking module imports...');
try {
  const interactive = require('./backend/utils/whatsappInteractive.js');
  
  const expectedExports = [
    'createButtonMenu',
    'createLanguageMenu',
    'createMainMenu',
    'createProduceSelectionMenu',
    'createConfirmationMenu',
    'createProgressMenu',
    'createServicesMenu',
    'parseButtonResponse'
  ];
  
  expectedExports.forEach(exp => {
    if (typeof interactive[exp] === 'function') {
      console.log(`  ✅ ${exp}`);
    } else {
      console.log(`  ❌ ${exp} not exported`);
    }
  });
} catch (e) {
  console.log(`  ⚠️  Could not import whatsappInteractive: ${e.message}`);
}

// Summary
console.log('\n📊 Validation Summary');
console.log('═'.repeat(50));

const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;

console.log(`Files: ${passed} ✅, ${failed} ❌`);

if (failed === 0 && passed > 0) {
  console.log('\n✨ All checks passed! The WhatsApp integration is ready.\n');
  console.log('Next steps:');
  console.log('  1. Run: npm start');
  console.log('  2. Scan the QR code with WhatsApp');
  console.log('  3. Send a message to test the integration\n');
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.\n');
}

console.log('For more information, see backend/utils/WHATSAPP_SETUP.md');
