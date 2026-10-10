import { sendOtpController, verifyOtpController, getCurrentUser, updateProfileController, logout } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';

export default async function authRoutes(fastify, opts) {
  fastify.post('/send-otp', sendOtpController);
  fastify.post('/verify-otp', verifyOtpController);
  fastify.get('/me', { preHandler: [authenticate] }, getCurrentUser);
  fastify.put('/me', { preHandler: [authenticate] }, updateProfileController);
  fastify.post('/logout', { preHandler: [authenticate] }, logout);
}