// D:/MyApplication/backend/src/modules/notifications/index.js

import { notificationService } from './service.js';
import { query } from '../../common/db.js';
import { authenticate } from '../auth/auth.middleware.js';

export default async function notificationRoutes(fastify, options) {

  // Fetch all notifications for the authenticated user
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const res = await query(`
        SELECT id, type, title, message, related_id, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);
      return res.rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // Mark a specific notification as read
  fastify.patch('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    try {
      const res = await query(`
        UPDATE notifications
        SET is_read = true
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [id, userId]);

      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read for the user
  fastify.patch('/read-all', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      await query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [userId]);
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to mark notifications as read' });
    }
  });

  // Endpoint to register a new device token
  fastify.post('/devices', async (request, reply) => {
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
  fastify.post('/test', async (request, reply) => {
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
