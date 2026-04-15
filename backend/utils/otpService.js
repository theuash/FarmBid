/**
 * OTP Service using Fast2SMS
 * Handles OTP generation, sending, and verification
 */

const axios = require('axios');
const crypto = require('crypto');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_BASE_URL = 'https://www.fast2sms.com/dev/bulkV2';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
const OTP_LENGTH = 6;

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

/**
 * Generate a random OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Fast2SMS
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @param {string} otp - OTP code to send
 * @returns {Promise<boolean>} - Success status
 */
const sendOTP = async (phoneNumber, otp) => {
  if (!FAST2SMS_API_KEY) {
    console.error('[OTP] Fast2SMS API key not configured');
    return false;
  }

  try {
    // Normalize phone number - remove all non-digits and add country code if missing
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('91') && normalizedPhone.length === 10) {
      // Assuming Indian numbers without country code
      normalizedPhone = '91' + normalizedPhone;
    }

    const message = `Your FarmBid OTP is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this OTP. Team FarmBid`;

    const response = await axios.post(
      FAST2SMS_BASE_URL,
      {
        route: 'otp',
        contacts: normalizedPhone,
        var_name: 'otp_name',
        otp_value: otp,
        templates: 'farmbid_otp'
      },
      {
        headers: {
          authorization: FAST2SMS_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: {
          authorization: FAST2SMS_API_KEY,
          route: 'otp',
          contacts: normalizedPhone,
          var_name: 'otp_name',
          otp_value: otp,
          templates: 'farmbid_otp'
        }
      }
    );

    if (response.data.return === true) {
      console.log(`[OTP] Sent to ${normalizedPhone}`);
      return true;
    } else {
      console.error('[OTP] Fast2SMS error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[OTP] Fast2SMS API error:', error.message);
    return false;
  }
};

/**
 * Send SMS via Fast2SMS (generic message)
 * @param {string} phoneNumber - Phone number
 * @param {string} message - Message to send
 * @returns {Promise<boolean>}
 */
const sendSMS = async (phoneNumber, message) => {
  if (!FAST2SMS_API_KEY) {
    console.error('[SMS] Fast2SMS API key not configured');
    return false;
  }

  try {
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('91') && normalizedPhone.length === 10) {
      normalizedPhone = '91' + normalizedPhone;
    }

    const response = await axios.post(
      FAST2SMS_BASE_URL,
      null,
      {
        headers: {
          authorization: FAST2SMS_API_KEY
        },
        params: {
          authorization: FAST2SMS_API_KEY,
          route: 'q',
          message: message,
          numbers: normalizedPhone
        }
      }
    );

    if (response.data.return === true) {
      console.log(`[SMS] Sent to ${normalizedPhone}`);
      return true;
    } else {
      console.error('[SMS] Fast2SMS error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[SMS] Fast2SMS API error:', error.message);
    return false;
  }
};

/**
 * Store OTP in memory/cache
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP code
 */
const storeOTP = (phoneNumber, otp) => {
  const expiryTime = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  otpStore.set(phoneNumber, {
    otp,
    expiryTime,
    attempts: 0,
    maxAttempts: 5
  });
  console.log(`[OTP] Stored for ${phoneNumber}, expires at ${new Date(expiryTime).toISOString()}`);
};

/**
 * Verify OTP
 * @param {string} phoneNumber - Phone number
 * @param {string} inputOTP - OTP entered by user
 * @returns {Object} - {valid: boolean, message: string}
 */
const verifyOTP = (phoneNumber, inputOTP) => {
  const storedData = otpStore.get(phoneNumber);

  if (!storedData) {
    return { valid: false, message: 'No OTP found for this number. Please request a new OTP.' };
  }

  // Check if OTP has expired
  if (Date.now() > storedData.expiryTime) {
    otpStore.delete(phoneNumber);
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check max attempts
  if (storedData.attempts >= storedData.maxAttempts) {
    otpStore.delete(phoneNumber);
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  // Verify OTP
  if (storedData.otp === inputOTP) {
    otpStore.delete(phoneNumber);
    return { valid: true, message: 'OTP verified successfully.' };
  } else {
    storedData.attempts += 1;
    const remaining = storedData.maxAttempts - storedData.attempts;
    return { 
      valid: false, 
      message: `Invalid OTP. ${remaining} attempts remaining.`,
      attemptsRemaining: remaining
    };
  }
};

/**
 * Generate and send OTP
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>} - {success: boolean, message: string}
 */
const generateAndSendOTP = async (phoneNumber) => {
  try {
    // Check if OTP was recently sent (anti-spam: 30 seconds)
    const storedData = otpStore.get(phoneNumber);
    if (storedData && Date.now() < storedData.expiryTime - (OTP_EXPIRY_MINUTES * 60 * 1000 - 30 * 1000)) {
      return {
        success: false,
        message: 'OTP already sent. Please wait before requesting a new one.'
      };
    }

    const otp = generateOTP();
    const sent = await sendOTP(phoneNumber, otp);

    if (sent) {
      storeOTP(phoneNumber, otp);
      return {
        success: true,
        message: 'OTP sent successfully to your phone.',
        expiryMinutes: OTP_EXPIRY_MINUTES
      };
    } else {
      return {
        success: false,
        message: 'Failed to send OTP. Please check your phone number and try again.'
      };
    }
  } catch (error) {
    console.error('[OTP] generateAndSendOTP error:', error);
    return {
      success: false,
      message: 'Error sending OTP. Please try again later.'
    };
  }
};

/**
 * Resend OTP
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>}
 */
const resendOTP = async (phoneNumber) => {
  otpStore.delete(phoneNumber); // Clear previous OTP
  return generateAndSendOTP(phoneNumber);
};

/**
 * Cleanup expired OTPs (run periodically)
 */
const cleanupExpiredOTPs = () => {
  let count = 0;
  for (const [phone, data] of otpStore.entries()) {
    if (Date.now() > data.expiryTime) {
      otpStore.delete(phone);
      count++;
    }
  }
  if (count > 0) {
    console.log(`[OTP] Cleaned up ${count} expired OTPs`);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  generateOTP,
  sendOTP,
  sendSMS,
  storeOTP,
  verifyOTP,
  generateAndSendOTP,
  resendOTP,
  cleanupExpiredOTPs
};
