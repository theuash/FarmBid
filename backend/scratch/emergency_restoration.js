const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetRegex = /const handlePaymentConfirm = async \(newBalance\) => \{[\s\S]+?toast\.error\('Connection error'\)[\s\S]+?\}[\s\S]+?\}/;

const restorationText = `const handlePaymentConfirm = async (newBalance) => {
    // Razorpay verification already happened in the PaymentDialog.
    // We just update the state with the verified balance returned from backend.
    if (newBalance !== undefined && typeof newBalance === 'number') {
      setWalletBalance(newBalance);
    } else {
      await fetchData(); // Fallback to full refresh
    }
    
    setTopupAmount('');
    setPaymentDialogOpen(false);
  }

  const handleEscrowLock = async (orderId, farmerAddress, amount) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(\`\${API_URL}/escrow/lock\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, farmerAddress, amountMATIC: amount })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Funds locked in Escrow!', {
          description: \`Transaction: \${data.txHash.substring(0, 10)}...\`
        })
      } else {
        toast.error(data.error || 'Escrow failed')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, restorationText);
    console.log('Successfully restored corrupted section.');
} else {
    // Fallback search if the regex is too strict
    console.log('Regex did not match. Trying broader search...');
    const fallbackRegex = /const handlePaymentConfirm = async \(newBalance\) => \{[\s\S]+?toast\.error\('Connection error'\)/;
    if (fallbackRegex.test(content)) {
        // Need to be careful with where the match ends
        content = content.replace(fallbackRegex, restorationText + '\n  // End of restoration');
         console.log('Fallback partial match replaced.');
    } else {
         console.log('CRITICAL: Could not find target section for restoration.');
    }
}

fs.writeFileSync(filePath, content, 'utf8');
