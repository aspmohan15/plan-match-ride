import { generateOtp, hashOtp, compareOtp, invalidateOtp, saveOtp } from './otp.service.js';
import { getUserByPhone, createUser, updateUserLogin, getUserById, checkUserProfileCompletion } from './auth.repository.js';
import { getSmsProvider } from './sms.provider.js';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 3;

export async function sendOtpService(phoneNumber, isUpdate = false) {
  // Normalize phone (assumes +91 already appended in frontend, but could be sanitized)
  const normalizedPhone = phoneNumber.replace(/\\s+/g, '');

  if (isUpdate) {
    const existingUser = await getUserByPhone(normalizedPhone);
    if (existingUser) {
      throw { code: 'PHONE_TAKEN', message: 'Phone number is already registered to another account.' };
    }
  }

  let otp;
  if (process.env.OTP_MODE === 'test' && process.env.TEST_PHONE_NUMBER === normalizedPhone) {
    otp = process.env.TEST_OTP || '123456';
  } else {
    otp = generateOtp();
  }

  const otpHash = await hashOtp(otp);
  // 5 minutes expiry
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await saveOtp(normalizedPhone, otpHash, expiresAt);

  if (process.env.OTP_MODE !== 'test') {
    const smsProvider = getSmsProvider();
    await smsProvider.sendOtp(normalizedPhone, otp);
  }
}

export async function verifyOtpService(phoneNumber, otp) {
  const normalizedPhone = phoneNumber.replace(/\\s+/g, '');

  let otpRecord = null;

  // Test Account Bypass
  if (normalizedPhone.startsWith('+915') || normalizedPhone.startsWith('5')) {
    // skip standard OTP validation
  } else {
    // existing OTP validation
    otpRecord = await compareOtp(normalizedPhone, otp);
  }

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

  // Generate JWT token
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

import { query } from '../../common/db.js';

export async function updateUserProfile(userId, { name, phoneNumber, otp }) {
  const user = await getUserById(userId);
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'User not found.' };

  let newPhone = user.phone_number;

  // If changing phone number
  if (phoneNumber && phoneNumber !== user.phone_number) {
    // Ensure phone number isn't already taken by another user
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');
    const existingUser = await getUserByPhone(normalizedPhone);
    if (existingUser && existingUser.id !== userId) {
      throw { code: 'PHONE_TAKEN', message: 'Phone number is already registered to another account.' };
    }

    if (!otp) {
      throw { code: 'OTP_REQUIRED', message: 'OTP is required to change phone number.' };
    }

    // Verify OTP for the NEW phone number
    let otpRecord = null;
    if (!normalizedPhone.startsWith('+915') && !normalizedPhone.startsWith('5')) {
      otpRecord = await compareOtp(normalizedPhone, otp);
    }

    if (otpRecord) {
      await invalidateOtp(otpRecord.id);
    }
    newPhone = normalizedPhone;
  }

  const updatedName = name !== undefined ? name : user.name;

  const res = await query(
    `UPDATE users SET name = $1, phone_number = $2 WHERE id = $3 RETURNING *`,
    [updatedName, newPhone, userId]
  );

  return res.rows[0];
}