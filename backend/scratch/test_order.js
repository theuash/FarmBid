const fetch = require('node-fetch');

async function testCreateOrder() {
  try {
    const res = await fetch('http://localhost:3001/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2, userId: 'test_user' })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testCreateOrder();
