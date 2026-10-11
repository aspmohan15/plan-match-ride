export async function sendTwilioVerifyOtp(phone) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifySid) {
    throw new Error('Twilio Verify is not configured properly in environment variables.');
  }

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
  const body = new URLSearchParams({
    To: phone,
    Channel: 'sms'
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw { code: 'TWILIO_ERROR', message: data.message || 'Failed to send OTP via Twilio' };
  }
  return data;
}

export async function checkTwilioVerifyOtp(phone, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifySid) {
    throw new Error('Twilio Verify is not configured properly in environment variables.');
  }

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationChecks`;
  const body = new URLSearchParams({
    To: phone,
    Code: code
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw { code: 'TWILIO_ERROR', message: data.message || 'Failed to verify OTP via Twilio' };
  }

  if (data.status !== 'approved') {
    throw { code: 'INVALID_OTP', message: 'Incorrect OTP. Please try again.' };
  }

  return data;
}
