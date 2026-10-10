import { query } from '../../common/db.js';

export async function getUserById(userId) {
  const result = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0];
}

export async function updateUserProfileImage(userId, imageUrl, publicId) {
  const result = await query(
    `UPDATE users SET profile_image_url = $1, profile_image_public_id = $2 WHERE id = $3 RETURNING *`,
    [imageUrl, publicId, userId]
  );
  console.log("[DB UPDATE RESULT] profile image:", result.rows[0]);
  return result.rows[0];
}

export async function updateUserBikeImage(userId, imageUrl, publicId) {
  const result = await query(
    `UPDATE users SET bike_image_url = $1, bike_image_public_id = $2 WHERE id = $3 RETURNING *`,
    [imageUrl, publicId, userId]
  );
  console.log("[DB UPDATE RESULT] bike image:", result.rows[0]);
  return result.rows[0];
}

export async function updateUserProfile(userId, name, bikeModel) {
  const result = await query(
    `UPDATE users SET name = $1, bike_model = $2 WHERE id = $3 RETURNING *`,
    [name, bikeModel, userId]
  );
  return result.rows[0];
}

export async function updateProfileCompleteStatus(userId) {
  const user = await getUserById(userId);
  if (!user) return false;

  const isComplete = Boolean(
    user.name &&
    user.profile_image_url &&
    user.bike_model &&
    user.bike_image_url
  );

  await query(`UPDATE users SET profile_completed = $1 WHERE id = $2`, [isComplete, userId]);
  return isComplete;
}