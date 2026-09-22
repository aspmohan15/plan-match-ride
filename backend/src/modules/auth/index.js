import authRoutes from './auth.routes.js';

export default async function (fastify, opts) {
  fastify.register(authRoutes);
}