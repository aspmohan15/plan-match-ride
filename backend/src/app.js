import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

// Import modules
import authRoutes from './modules/auth/index.js';
import tripRoutes from './modules/trips/index.js';
import matchingRoutes from './modules/matching/index.js';
import chatRoutes from './modules/chat/index.js';
import notificationRoutes from './modules/notifications/index.js';
import locationRoutes from './modules/locations/index.js';
import groupRoutes from './modules/groups/index.js';
import userRoutes from './modules/users/index.js';
import { testConnection } from './common/db.js';

const fastify = Fastify({ logger: true });

// Register Plugins
fastify.register(fastifyWebsocket);

// Register Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(tripRoutes, { prefix: '/api/v1/trips' });
fastify.register(matchingRoutes, { prefix: '/api/v1' });
fastify.register(chatRoutes, { prefix: '/api/v1/chat' });
fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });
fastify.register(locationRoutes, { prefix: '/api/v1/locations' });
fastify.register(groupRoutes, { prefix: '/api/v1/groups' });
fastify.register(userRoutes, { prefix: '/api/v1/users' });

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    // 1. Test database connection before starting the server
    const isDbConnected = await testConnection();
    if (!isDbConnected) {
      fastify.log.warn("Starting server without a working database connection. API calls will fail.");
    }

    // 2. Start the server
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
