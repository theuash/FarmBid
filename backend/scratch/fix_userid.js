const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'frontend', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<PaymentDialog\s+isOpen={paymentDialogOpen}\s+onClose=\{\(\) => setPaymentDialogOpen\(false\)\}\s+amount=\{parseFloat\(topupAmount\)\}\s+onConfirm=\{handlePaymentConfirm\}\s+initialPhase="scanner"\s+\/>/;

const replacement = `<PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          amount={parseFloat(topupAmount)}
          onConfirm={handlePaymentConfirm}
          userId={currentUser?.id}
          initialPhase="scanner"
        />`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully added userId to PaymentDialog.');
} else {
    console.log('Failed to find PaymentDialog matching the regex.');
}
