/**
 * Normalizes phone numbers from different channels (Twilio, WhatsApp, local)
 * to a consistent 10-digit format for database indexing.
 */
function normalizeTo10Digits(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let digits = phone.toString().replace(/\D/g, '');
  
  // If it starts with 91 and is 12 digits, strip the 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  
  // Return the last 10 digits if possible
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  
  return digits;
}

module.exports = { normalizeTo10Digits };
