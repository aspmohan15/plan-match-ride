import { authenticate } from '../auth/auth.middleware.js';
import { updateProfileImage, updateBikeImage, updateProfileInfo, searchUserByPhone } from './user.controller.js';

export default async function userRoutes(fastify, opts) {
  fastify.post('/me/profile-image', { preHandler: [authenticate] }, updateProfileImage);
  fastify.post('/me/bike-image', { preHandler: [authenticate] }, updateBikeImage);
  fastify.patch('/me', { preHandler: [authenticate] }, updateProfileInfo);
  fastify.get('/search', { preHandler: [authenticate] }, searchUserByPhone);
}