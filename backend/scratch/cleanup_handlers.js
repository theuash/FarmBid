const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Refactor handleTopupClick
const oldTopupClick = /const handleTopupClick = \(\\) => \{[\s\S]+?setPaymentDialogOpen\(true\)[\s\S]+?\}/;
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

content = content.replace(oldTopupClick, newTopupClick);

// 2. Refactor handlePaymentConfirm
const oldPaymentConfirm = /const handlePaymentConfirm = async \(method, referenceId\) => \{[\s\S]+?setTopupLoading\(false\)[\s\S]+?\}/;
const newPaymentConfirm = `const handlePaymentConfirm = async (newBalance) => {
    // Razorpay verification already happened in the PaymentDialog.
    // We just update the state with the verified balance returned from backend.
    if (newBalance !== undefined && typeof newBalance === 'number') {
      setWalletBalance(newBalance);
    } else {
      await fetchData(); // Fallback to full refresh if balance not provided
    }
    
    setTopupAmount('');
    setPaymentDialogOpen(false);
  }`;

content = content.replace(oldPaymentConfirm, newPaymentConfirm);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored top-up handlers in page.js');
