import { sendOtpService, verifyOtpService, getUserProfile, updateUserProfile } from './auth.service.js';

export async function sendOtpController(request, reply) {
  try {
    const { phoneNumber, isUpdate } = request.body || {};

    if (!phoneNumber) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Phone number is required.' }
      });
    }

    await sendOtpService(phoneNumber, isUpdate);

    return reply.send({
      success: true,
      data: { message: 'OTP sent successfully.' }
    });
  } catch (error) {
    if (error.code) {
      return reply.code(400).send({ success: false, error: { code: error.code, message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
    });
  }
}

export async function verifyOtpController(request, reply) {
  try {
    const { phoneNumber, otp } = request.body || {};

    if (!phoneNumber || !otp) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Phone number and OTP are required.' }
      });
    }

    const result = await verifyOtpService(phoneNumber, otp);

    return reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.code) {
      return reply.code(400).send({ success: false, error: { code: error.code, message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
    });
  }
}

export async function getCurrentUser(request, reply) {
  try {
    const userId = request.user.id;
    const user = await getUserProfile(userId);

    if (!user) {
      return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' }});
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phone_number,
          profileImageUrl: user.profile_image_url,
          bikeModel: user.bike_model,
          bikeImageUrl: user.bike_image_url,
          profileCompleted: user.profile_completed
        }
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
    });
  }
}

export async function updateProfileController(request, reply) {
  try {
    const userId = request.user.id;
    const { name, phoneNumber, otp } = request.body || {};

    const result = await updateUserProfile(userId, { name, phoneNumber, otp });

    return reply.send({
      success: true,
      data: {
        message: 'Profile updated successfully.',
        user: {
          id: result.id,
          name: result.name,
          phoneNumber: result.phone_number
        }
      }
    });
  } catch (error) {
    if (error.code) {
      return reply.code(400).send({ success: false, error: { code: error.code, message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
    });
  }
}

export async function logout(request, reply) {
  // In a real app, you might want to invalidate the JWT token in a blacklist/redis
  return reply.send({
    success: true,
    data: { message: 'Logged out successfully.' }
  });
}