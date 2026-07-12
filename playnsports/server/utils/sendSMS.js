import twilio from 'twilio';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

const isConfigured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

let client = null;
if (isConfigured) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn(
    '⚠️  Twilio credentials not set (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER). ' +
    'Phone OTPs will be printed to the server console instead of being sent as a real SMS.'
  );
}

// Normalizes a raw 10-digit Indian number (or anything without a country
// code) into E.164 format that Twilio requires. If it already looks like
// E.164 (starts with +), it's left untouched.
const toE164 = (phone) => {
  const trimmed = String(phone).trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return `+91${digits}`; // defaults to India; adjust if you support other countries
};

const sendOTPSms = async (phone, otp) => {
  const to = toE164(phone);

  if (!isConfigured) {
    // Dev-mode fallback so phone verification is testable without a live
    // Twilio account. Replace/remove once real credentials are added to .env.
    console.log(`📱 [DEV MODE] SMS OTP for ${to}: ${otp}`);
    return;
  }

  try {
    await client.messages.create({
      body: `Your spotNplay verification code is ${otp}. It expires in 10 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('SMS OTP sent ✅');
  } catch (error) {
    console.error('SMS send error:', error);
    throw new Error('Failed to send SMS. Please check the phone number and try again.');
  }
};

export default sendOTPSms;
