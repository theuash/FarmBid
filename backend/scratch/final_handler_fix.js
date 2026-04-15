const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Surgical replacement for handleTopupClick
const topupClickRegex = /const handleTopupClick = \(\) => \{[\s\S]+?setPaymentDialogOpen\(true\)[\s\S]+?\}/;
const newTopupClick = `const handleTopupClick = () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to top up wallet');
      window.location.href = '/login';
      return;
    }

    if (!topupAmount || isNaN(topupAmount) || parseFloat(topupAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    // Open the secure Razorpay Payment Dialog
    setPaymentDialogOpen(true)
  }`;

if (topupClickRegex.test(content)) {
    content = content.replace(topupClickRegex, newTopupClick);
    console.log('Match successfully replaced for handleTopupClick');
} else {
    console.log('No match found for handleTopupClick');
}

// 2. Surgical replacement for handlePaymentConfirm
const paymentConfirmRegex = /const handlePaymentConfirm = async \(method, referenceId\) => \{[\s\S]+?setTopupLoading\(false\)[\s\S]+?\}/;
const newPaymentConfirm = `const handlePaymentConfirm = async (newBalance) => {
    // Razorpay verification already happened in the PaymentDialog.
    // We just update the state with the verified balance returned from backend.
    if (newBalance !== undefined && typeof newBalance === 'number') {
      setWalletBalance(newBalance);
    } else {
      await fetchData(); // Fallback to full refresh
    }
    
    setTopupAmount('');
    setPaymentDialogOpen(false);
  }`;

if (paymentConfirmRegex.test(content)) {
    content = content.replace(paymentConfirmRegex, newPaymentConfirm);
    console.log('Match successfully replaced for handlePaymentConfirm');
} else {
    console.log('No match found for handlePaymentConfirm');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Operation complete.');
