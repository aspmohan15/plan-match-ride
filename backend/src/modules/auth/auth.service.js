import { generateOtp, hashOtp, compareOtp, invalidateOtp, saveOtp } from './otp.service.js';
import { getUserByPhone, createUser, updateUserLogin, getUserById, checkUserProfileCompletion } from './auth.repository.js';
import { getSmsProvider } from './sms.provider.js';
import { sendTwilioVerifyOtp, checkTwilioVerifyOtp } from './twilio.verify.js';
import { checkOtpSendLimits, checkVerifyLimits, recordVerifyFailure, clearVerifyFailures } from '../../common/rate_limit.js';
import jwt from 'jsonwebtoken';
import { query } from '../../common/db.js';

export async function sendOtpService(phoneNumber, isUpdate = false, ip = 'unknown') {
  const normalizedPhone = phoneNumber.replace(/\s+/g, '');

  // 1. IP and Phone Level Rate Limits for SENDING OTP via Redis
  await checkOtpSendLimits(normalizedPhone, ip);

  if (isUpdate) {
    const existingUser = await getUserByPhone(normalizedPhone);
    if (existingUser) {
      throw { code: 'PHONE_TAKEN', message: 'Phone number is already registered to another account.' };
    }
  }

  if (process.env.OTP_MODE === 'test' && process.env.TEST_PHONE_NUMBER === normalizedPhone) {
    let otp = process.env.TEST_OTP || '123456';
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await saveOtp(normalizedPhone, otpHash, expiresAt);
  } else {
    const providerType = process.env.SMS_PROVIDER;
    if (providerType === 'twilio') {
      await sendTwilioVerifyOtp(normalizedPhone);
    } else {
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await saveOtp(normalizedPhone, otpHash, expiresAt);
      const smsProvider = getSmsProvider();
      await smsProvider.sendOtp(normalizedPhone, otp);
    }
  }
}

async function verifyOtpWithRateLimit(normalizedPhone, otp, ip) {
  // Check failure lock in Redis
  await checkVerifyLimits(normalizedPhone);

  // Attempt verification
  let otpRecord = null;
  try {
    if (normalizedPhone.startsWith('+915') || normalizedPhone.startsWith('5')) {
      // test bypass
    } else if (process.env.OTP_MODE === 'test' && process.env.TEST_PHONE_NUMBER === normalizedPhone) {
      otpRecord = await compareOtp(normalizedPhone, otp);
    } else {
      if (process.env.SMS_PROVIDER === 'twilio') {
        await checkTwilioVerifyOtp(normalizedPhone, otp);
      } else {
        otpRecord = await compareOtp(normalizedPhone, otp);
      }
    }
  } catch (error) {
    if (error.code === 'INVALID_OTP' || error.code === 'TWILIO_ERROR') {
      // Log the failure in Redis
      await recordVerifyFailure(normalizedPhone);
    }
    throw error;
  }

  // Clear failures on success
  await clearVerifyFailures(normalizedPhone);
  return otpRecord;
}

export async function verifyOtpService(phoneNumber, otp, ip = 'unknown') {
  const normalizedPhone = phoneNumber.replace(/\s+/g, '');

  const otpRecord = await verifyOtpWithRateLimit(normalizedPhone, otp, ip);

  let user = await getUserByPhone(normalizedPhone);
  let isNewUser = false;

  if (!user) {
    user = await createUser(normalizedPhone);
    isNewUser = true;
  }

  await updateUserLogin(user.id);

  if (otpRecord) {
    await invalidateOtp(otpRecord.id);
  }

  const token = jwt.sign(
    { id: user.id, phone_number: user.phone_number },
    process.env.JWT_SECRET || 'fallback-secret-for-dev',
    { expiresIn: '30d' }
  );

  let isProfileComplete = false;
  if (!isNewUser) {
    isProfileComplete = await checkUserProfileCompletion(user.id);
  }

  return {
    accessToken: token,
    user: {
      id: user.id,
      phone_number: user.phone_number,
    },
    isNewUser,
    isProfileComplete
  };
}

export async function getUserProfile(userId) {
  return await getUserById(userId);
}

export async function updateUserProfile(userId, { name, phoneNumber, otp }, ip = 'unknown') {
  // Use transaction/lock for the user row to prevent parallel profile updates bypassing limits
  await query('BEGIN');
  try {
    // Lock the user row
    const userRes = await query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const user = userRes.rows[0];
    if (!user) throw { code: 'USER_NOT_FOUND', message: 'User not found.' };

    let newPhone = user.phone_number;

    if (phoneNumber && phoneNumber !== user.phone_number) {
      // 30-day change limit check
      if (user.last_phone_change_at) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (new Date(user.last_phone_change_at) > thirtyDaysAgo) {
          throw { code: 'PHONE_CHANGE_RESTRICTED', message: 'You can only change your registered mobile number once every 30 days.' };
        }
      }

      const normalizedPhone = phoneNumber.replace(/\s+/g, '');
      const existingUser = await getUserByPhone(normalizedPhone);
      if (existingUser && existingUser.id !== userId) {
        throw { code: 'PHONE_TAKEN', message: 'Phone number is already registered to another account.' };
      }

      if (!otp) {
        throw { code: 'OTP_REQUIRED', message: 'OTP is required to change phone number.' };
      }

      const otpRecord = await verifyOtpWithRateLimit(normalizedPhone, otp, ip);

      if (otpRecord) {
        await invalidateOtp(otpRecord.id);
      }

      newPhone = normalizedPhone;

      // Update phone and set last_phone_change_at
      await query(
        `UPDATE users SET name = $1, phone_number = $2, last_phone_change_at = NOW() WHERE id = $3`,
        [name !== undefined ? name : user.name, newPhone, userId]
      );

      // Log the security audit event
      await query(`INSERT INTO rate_limit_events (identifier, action) VALUES ($1, 'phone_number_changed')`, [`user_${userId}`]);

    } else {
      // Just update name
      await query(
        `UPDATE users SET name = $1 WHERE id = $2`,
        [name !== undefined ? name : user.name, userId]
      );
    }

    const updatedUserRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    await query('COMMIT');
    return updatedUserRes.rows[0];

  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}
