#!/usr/bin/env node
// test-chatbot removed. Use backend/chatbot.js instead.
// To run the chatbot, use: node backend\chatbot.js


const { handleChatbotMessage, conversationStates } = require('./utils/whatsapp');

// Mock message object
const createMockMessage = (from, body) => ({
  from: from,
  body: body,
  hasMedia: false
});

// Mock functions to capture responses
let lastResponse = null;
const mockSendButtonMessage = async (to, body, buttons) => {
  lastResponse = { type: 'button', to, body, buttons };
  console.log(`📱 BUTTON to ${to}: ${body}`);
  buttons.forEach(btn => console.log(`   [${btn.id}] ${btn.title}`));
};

const mockSendListMessage = async (to, body, sections) => {
  lastResponse = { type: 'list', to, body, sections };
  console.log(`📱 LIST to ${to}: ${body}`);
  sections.forEach(section => {
    console.log(`   ${section.title}:`);
    section.rows.forEach(row => console.log(`     • ${row.title}: ${row.description}`));
  });
};

const mockSendTextMessage = async (to, body) => {
  lastResponse = { type: 'text', to, body };
  console.log(`📱 TEXT to ${to}: ${body}`);
};

// Override the send functions for testing
const originalModule = require('./utils/whatsapp');
originalModule.sendButtonMessage = mockSendButtonMessage;
originalModule.sendListMessage = mockSendListMessage;
originalModule.sendTextMessage = mockSendTextMessage;

// Test scenarios
async function runTests() {
  console.log('🧪 Starting FarmBid WhatsApp Chatbot Tests\n');

  const testPhone = '1234567890';

  // Test 1: New user welcome
  console.log('Test 1: New user sends first message');
  await handleChatbotMessage(createMockMessage(testPhone, 'hello'));
  console.log('');

  // Test 2: User selects create listing
  console.log('Test 2: User selects "Create Listing"');
  await handleChatbotMessage(createMockMessage(testPhone, 'btn_create_listing'));
  console.log('');

  // Test 3: User selects farmer role
  console.log('Test 3: User selects "Farmer"');
  await handleChatbotMessage(createMockMessage(testPhone, 'btn_farmer'));
  console.log('');

  // Test 4: User selects new listing
  console.log('Test 4: User selects "Create Listing" from farmer menu');
  await handleChatbotMessage(createMockMessage(testPhone, 'btn_new_listing'));
  console.log('');

  // Test 5: User sends weight
  console.log('Test 5: User enters weight "500"');
  await handleChatbotMessage(createMockMessage(testPhone, '500'));
  console.log('');

  // Test 6: User sends price
  console.log('Test 6: User enters price "40"');
  await handleChatbotMessage(createMockMessage(testPhone, '40'));
  console.log('');

  // Test 7: User sends location
  console.log('Test 7: User enters location "Mumbai"');
  await handleChatbotMessage(createMockMessage(testPhone, 'Mumbai'));
  console.log('');

  console.log('✅ All tests completed!');
  console.log('\nConversation states:', JSON.stringify([...conversationStates.entries()], null, 2));
}

runTests().catch(console.error);