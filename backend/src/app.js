// ⚠️ Development Only: Bypass strict SSL certificate checks.
// Required for company laptops/VPNs that intercept SSL traffic (Fixes UNABLE_TO_GET_ISSUER_CERT_LOCALLY).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';

import fastifyCors from '@fastify/cors';

// Import modules
import authRoutes from './modules/auth/index.js';
import tripRoutes from './modules/trips/index.js';
import matchingRoutes from './modules/matching/index.js';
import chatRoutes from './modules/chat/index.js';
import notificationRoutes from './modules/notifications/index.js';
import locationRoutes from './modules/locations/index.js';
import groupRoutes from './modules/groups/index.js';
import userRoutes from './modules/users/index.js';
import discoverRoutes from './modules/discover/index.js';
import { testConnection } from './common/db.js';

const fastify = Fastify({ logger: true });

// Register Plugins
fastify.register(fastifyCors, {
  origin: true // Allows all origins, necessary for local dev with real devices
});
fastify.register(fastifyWebsocket);
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Register Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(tripRoutes, { prefix: '/api/v1/trips' });
fastify.register(matchingRoutes, { prefix: '/api/v1' });
fastify.register(chatRoutes, { prefix: '/api/v1/chat' });
fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });
fastify.register(locationRoutes, { prefix: '/api/v1/locations' });
fastify.register(groupRoutes, { prefix: '/api/v1/groups' });
fastify.register(userRoutes, { prefix: '/api/v1/users' });
fastify.register(discoverRoutes, { prefix: '/api/v1/discover' });

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

    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();