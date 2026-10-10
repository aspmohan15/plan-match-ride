class ConsoleProvider {
  async sendOtp(phone, otp) {
    console.log(`[ConsoleProvider] 📱 Sending OTP to ${phone}: ${otp}`);
  }
}

class TwilioProvider {
  constructor() {
    // Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
    console.log('[TwilioProvider] Initialized (make sure to install twilio package if used in prod)');
  }
  async sendOtp(phone, otp) {
    console.log(`[TwilioProvider] Sending OTP to ${phone}`);
    // implementation details for twilio...
  }
}

export function getSmsProvider() {
  const providerType = process.env.SMS_PROVIDER || 'console';
  if (providerType === 'twilio') {
    return new TwilioProvider();
  }
  return new ConsoleProvider();
}