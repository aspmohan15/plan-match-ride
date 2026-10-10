import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../../common/db.js';

export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOtp(otp) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
}

export async function saveOtp(phone, otpHash, expiresAt) {
  await query(
    `INSERT INTO otp_verifications (phone_number, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [phone, otpHash, expiresAt]
  );
}

export async function compareOtp(phone, otp) {
  const result = await query(
    `SELECT * FROM otp_verifications
     WHERE phone_number = $1 AND verified_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );

  const otpRecord = result.rows[0];

  if (!otpRecord) {
    throw { code: 'INVALID_OTP', message: 'The OTP is invalid or expired.' };
  }

  if (new Date() > new Date(otpRecord.expires_at)) {
    throw { code: 'OTP_EXPIRED', message: 'This OTP has expired. Please request a new one.' };
  }

  if (otpRecord.attempts >= 3) {
    throw { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts. Request a new OTP.' };
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

  if (!isValid) {
    await query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [otpRecord.id]);
    throw { code: 'INVALID_OTP', message: 'Incorrect OTP. Please try again.' };
  }

  return otpRecord;
}

export async function invalidateOtp(otpId) {
  await query(`UPDATE otp_verifications SET verified_at = CURRENT_TIMESTAMP WHERE id = $1`, [otpId]);
}