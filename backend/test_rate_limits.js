process.env.DATABASE_URL = 'postgresql://postgres:123@localhost:5432/ride_match';
import { sendOtpService, verifyOtpService, updateUserProfile } from './src/modules/auth/auth.service.js';
import { query } from './src/common/db.js';

async function runTests() {
  process.env.OTP_MODE = 'test';
  process.env.TEST_PHONE_NUMBER = '+919999999999';
  process.env.TEST_OTP = '123456';

  const testPhone = '+919999999999';

  // Cleanup test state
  await query(`DELETE FROM rate_limit_events WHERE identifier LIKE '%9999999999%'`);
  await query(`DELETE FROM rate_limit_events WHERE identifier = 'ip_send_127.0.0.1'`);
  await query(`DELETE FROM users WHERE phone_number = $1`, [testPhone]);

  console.log("--- TEST 1: Sending OTP limits ---");
  try {
    await sendOtpService(testPhone, false, '127.0.0.1');
    console.log("✅ First OTP sent");

    // Attempt immediately again (should fail < 30s)
    try {
      await sendOtpService(testPhone, false, '127.0.0.1');
      console.error("❌ Failed: Second OTP should be blocked < 30s");
    } catch(e) {
      if(e.code === 'RATE_LIMIT_EXCEEDED') console.log("✅ Correctly blocked < 30s");
      else console.error("❌ Expected rate limit, got", e);
    }
  } catch(e) {
    console.error("Test 1 Failed:", e);
  }

  // Clear limits to test the 3 per 15 min limit
  await query(`DELETE FROM rate_limit_events WHERE identifier LIKE '%9999999999%'`);

  console.log("\\n--- TEST 2: Max 3 per 15 mins ---");
  for (let i = 1; i <= 4; i++) {
    try {
      await sendOtpService(testPhone, false, '127.0.0.1');
      console.log(`✅ Sent OTP ${i}`);
      // Manually modify created_at to bypass 30s rule for testing 15m rule
      await query(`UPDATE rate_limit_events SET created_at = NOW() - INTERVAL '1 minute'`);
    } catch(e) {
      if(i === 4 && e.code === 'RATE_LIMIT_EXCEEDED') console.log(`✅ Correctly blocked 4th OTP`);
      else console.error(`❌ Unexpected error on attempt ${i}:`, e);
    }
  }

  // Cleanup for verification test
  await query(`DELETE FROM rate_limit_events WHERE identifier LIKE '%9999999999%'`);
  await query(`DELETE FROM otp_verifications WHERE phone_number = $1`, [testPhone]);

  console.log("\\n--- TEST 3: Verification Attempts ---");
  // Setup: send one valid OTP
  await sendOtpService(testPhone, false, '127.0.0.1');

  for (let i = 1; i <= 6; i++) {
    try {
      await verifyOtpService(testPhone, '000000', '127.0.0.1'); // wrong OTP
      console.error(`❌ Expected failure on verify attempt ${i}`);
    } catch (e) {
      if (i <= 5 && e.code === 'INVALID_OTP') console.log(`✅ Attempt ${i} correctly invalid`);
      else if (i === 6 && e.code === 'RATE_LIMIT_EXCEEDED') console.log(`✅ Attempt ${i} correctly locked out for 15 mins`);
      else console.error(`❌ Unexpected error on verify attempt ${i}:`, e.message);
    }
  }

  console.log("\\n--- TEST 4: Phone Change Restriction ---");
  try {
    // Manually register the test phone first
    // Note: since test 3 failed all verifications, user is not created yet.
    // We'll simulate a valid verify to create the user.
    await query(`DELETE FROM rate_limit_events WHERE identifier LIKE '%9999999999%'`);
    const { user } = await verifyOtpService(testPhone, '123456', '127.0.0.1');
    console.log("✅ Test user logged in");

    // Set last_phone_change_at to yesterday
    await query(`UPDATE users SET last_phone_change_at = NOW() - INTERVAL '1 day' WHERE id = $1`, [user.id]);

    try {
      await updateUserProfile(user.id, { name: 'Test', phoneNumber: '+919999999998', otp: '000000' }, '127.0.0.1');
    } catch (e) {
      if (e.code === 'PHONE_CHANGE_RESTRICTED') {
        console.log("✅ Correctly restricted 30-day phone change limit");
      } else {
        console.error("❌ Expected PHONE_CHANGE_RESTRICTED but got:", e.message);
      }
    }
  } catch(e) {
    console.error("Test 4 Failed:", e);
  }

  process.exit();
}

runTests();