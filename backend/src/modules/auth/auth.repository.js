import { query } from '../../common/db.js';

export async function getUserByPhone(phone) {
  const result = await query(`SELECT * FROM users WHERE phone_number = $1`, [phone]);
  return result.rows[0];
}

export async function createUser(phone) {
  const result = await query(
    `INSERT INTO users (phone_number, phone_verified) VALUES ($1, true) RETURNING *`,
    [phone]
  );
  return result.rows[0];
}

export async function updateUserLogin(userId) {
  await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
}

export async function getUserById(userId) {
  const result = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0];
}

export async function checkUserProfileCompletion(userId) {
  const result = await query(`SELECT profile_completed FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  return !!user && user.profile_completed;
}