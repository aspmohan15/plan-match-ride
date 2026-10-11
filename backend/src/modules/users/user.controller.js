import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../../common/cloudinary.js';
import { getUserById, updateProfileCompleteStatus, updateUserProfile } from './user.repository.js';
import { query } from '../../common/db.js';
import crypto from 'crypto';

async function handleImageUpload(request, reply, folderPrefix) {
  try {
    console.log("\n=== [BACKEND] STARTING IMAGE UPLOAD ===");
    console.log("1. Awaiting request.file()...");
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ success: false, error: { code: 'NO_FILE', message: 'No image uploaded' } });
    }

    if (!data.mimetype.startsWith('image/')) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_TYPE', message: 'Only images are allowed' } });
    }

    const buffer = await data.toBuffer();
    console.log("2. File parsed! Sending to Cloudinary...");
    const userId = request.user.id;
    const user = await getUserById(userId);

    if (!user) {
      return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' }});
    }

    const folder = `tripmates/users/${userId}/${folderPrefix}`;
    const publicId = `${folderPrefix}-image-${crypto.randomBytes(4).toString('hex')}`;

    const uploadResult = await uploadImageToCloudinary(buffer, folder, publicId);
    console.log("CLOUDINARY RESULT:", uploadResult);
    console.log("3. Cloudinary Upload Success! URL:", uploadResult.secure_url);

    const prevPublicId = folderPrefix === 'profile' ? user.profile_image_public_id : user.bike_image_public_id;

    let updateQuery;
    let dbResult

    console.log("4. Executing SQL update for user ID:", request.user.id);

    if (folderPrefix === 'profile') {
      updateQuery = 'UPDATE users SET profile_image_url = $1, profile_image_public_id = $2 WHERE id = $3 RETURNING *';
      dbResult = await query(updateQuery, [uploadResult.secure_url, uploadResult.public_id, userId]);
      console.log("[DB UPDATE RESULT] profile:", dbResult.rows[0]);
    } else if (folderPrefix === 'bike') {
      updateQuery = 'UPDATE users SET bike_image_url = $1, bike_image_public_id = $2 WHERE id = $3 RETURNING *';
      dbResult = await query(updateQuery, [uploadResult.secure_url, uploadResult.public_id, userId]);
      console.log("[DB UPDATE RESULT] bike:", dbResult.rows[0]);
    }

    console.log("5. Database updated!", dbResult.rows[0]);

    await updateProfileCompleteStatus(userId);

    if (prevPublicId) {
      await deleteImageFromCloudinary(prevPublicId);
    }

    console.log("=== [BACKEND] UPLOAD FINISHED ===\n");
    return reply.send({
      success: true,
      data: {
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      }
    });

  } catch (error) {
    console.error("\n=== [BACKEND] UPLOAD FAILED ===", error, "\n");
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'IMAGE_UPLOAD_FAILED', message: 'Unable to upload image. Please try again.' }
    });
  }
}

export async function updateProfileImage(request, reply) {
  return handleImageUpload(request, reply, 'profile');
}

export async function updateBikeImage(request, reply) {
  return handleImageUpload(request, reply, 'bike');
}

export async function updateProfileInfo(request, reply) {
  try {
    const { name, bikeModel } = request.body || {};
    const userId = request.user.id;

    const user = await getUserById(userId);
    if (!user) {
      return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' }});
    }

    const newName = name !== undefined ? name : user.name;
    const newBikeModel = bikeModel !== undefined ? bikeModel : user.bike_model;

    await updateUserProfile(userId, newName, newBikeModel);
    await updateProfileCompleteStatus(userId);

    return reply.send({
      success: true,
      data: { message: 'Profile updated successfully' }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Unable to update profile.' }
    });
  }
}

export async function searchUserByPhone(request, reply) {
  try {
    const { phone } = request.query;
    if (!phone) {
      return reply.code(400).send({ success: false, error: { code: 'MISSING_PHONE', message: 'Phone number is required' }});
    }

    // Normalize phone (strip spaces)
    const normalizedPhone = phone.replace(/\s+/g, '');

    const res = await query(
      `SELECT u.id, u.name as full_name, u.phone_number, u.profile_image_url, u.bike_model as model, u.bike_image_url
       FROM users u
       WHERE u.phone_number = $1`,
      [normalizedPhone]
    );

    if (res.rows.length === 0) {
      return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' }});
    }

    return reply.send(res.rows[0]);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'SEARCH_FAILED', message: 'Unable to search user' }
    });
  }
}