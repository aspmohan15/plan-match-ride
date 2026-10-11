process.env.DATABASE_URL = 'postgresql://postgres:123@localhost:5432/ride_match';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OTP_MODE = 'test';
process.env.TEST_PHONE_NUMBER = '+919999999999';
process.env.TEST_OTP = '123456';

import { sendOtpService, verifyOtpService, updateUserProfile } from './src/modules/auth/auth.service.js';
import { query } from './src/common/db.js';
import redis from './src/common/redis.js';

async function runTests() {
  const testPhone = '+919999999999';
  const testIp = '127.0.0.1';

  // Cleanup test state
  await redis.del(`rl:otp:cd:${testPhone}`);
  await redis.del(`rl:otp:15m:${testPhone}`);
  await redis.del(`rl:otp:24h:${testPhone}`);
  await redis.del(`rl:otp:fails:${testPhone}`);
  await redis.del(`rl:ip:send:${testIp}`);
  await query(`DELETE FROM users WHERE phone_number = $1`, [testPhone]);

  console.log("--- TEST 1: Sending OTP limits ---");
  try {
    await sendOtpService(testPhone, false, testIp);
    console.log("✅ First OTP sent");

    // Attempt immediately again (should fail < 30s)
    try {
      await sendOtpService(testPhone, false, testIp);
      console.error("❌ Failed: Second OTP should be blocked < 30s");
    } catch(e) {
      if(e.code === 'RATE_LIMIT_EXCEEDED') console.log("✅ Correctly blocked < 30s");
      else console.error("❌ Expected rate limit, got", e);
    }
  } catch(e) {
    console.error("Test 1 Failed:", e);
  }

  // Clear 30s limit to test the 3 per 15 min limit
  await redis.del(`rl:otp:cd:${testPhone}`);

  console.log("\\n--- TEST 2: Max 3 per 15 mins ---");
  for (let i = 1; i <= 4; i++) {
    try {
      await sendOtpService(testPhone, false, testIp);
      console.log(`✅ Sent OTP ${i}`);
      // Manually delete the cooldown key between rapid loop sends
      await redis.del(`rl:otp:cd:${testPhone}`);
    } catch(e) {
      if(i === 3 && e.code === 'RATE_LIMIT_EXCEEDED') console.log(`✅ Correctly blocked 4th OTP`);
      else console.error(`❌ Unexpected error on attempt ${i}:`, e.message);
    }
  }

  // Cleanup for verification test
  await redis.del(`rl:otp:cd:${testPhone}`);
  await redis.del(`rl:otp:15m:${testPhone}`);
  await query(`DELETE FROM otp_verifications WHERE phone_number = $1`, [testPhone]);

  console.log("\\n--- TEST 3: Verification Attempts ---");
  // Setup: send one valid OTP
  await sendOtpService(testPhone, false, testIp);

  for (let i = 1; i <= 6; i++) {
    try {
      await verifyOtpService(testPhone, '000000', testIp); // wrong OTP
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
    await redis.del(`rl:otp:fails:${testPhone}`); // clear verification ban
    const { user } = await verifyOtpService(testPhone, '123456', testIp);
    console.log("✅ Test user logged in");

    // Set last_phone_change_at to yesterday
    await query(`UPDATE users SET last_phone_change_at = NOW() - INTERVAL '1 day' WHERE id = $1`, [user.id]);

    try {
      await updateUserProfile(user.id, { name: 'Test', phoneNumber: '+919999999998', otp: '000000' }, testIp);
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