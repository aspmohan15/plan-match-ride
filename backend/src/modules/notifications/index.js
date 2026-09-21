// D:/MyApplication/backend/src/modules/notifications/index.js

import { notificationService } from './service.js';

export default async function notificationRoutes(fastify, options) {

  // Endpoint to register a new device token
  fastify.post('/api/v1/devices', async (request, reply) => {
    const { userId, token } = request.body;

    if (!userId || !token) {
      return reply.status(400).send({ error: 'userId and token are required' });
    }

    try {
      const result = await notificationService.saveDeviceToken(userId, token);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to save device token' });
    }
  });

  // Mock endpoint to trigger a test notification (useful for dev)
  fastify.post('/api/v1/notifications/test', async (request, reply) => {
    const { token, title, body } = request.body;

    if (!token || !title || !body) {
      return reply.status(400).send({ error: 'token, title, and body are required' });
    }

    try {
      const result = await notificationService.sendPushNotification(token, title, body);
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to send notification' });
    }
  });

}
