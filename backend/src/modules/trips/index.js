import { query } from '../../common/db.js';
import { authenticate } from '../auth/auth.middleware.js';

export default async function (fastify, opts) {

  // Get all active public upcoming trips
  fastify.get('/', async (request, reply) => {
    try {
      const res = await query(`
        SELECT t.*, u.name as user_name, u.profile_image_url
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE t.status = $1 AND t.start_time >= CURRENT_TIMESTAMP
        ORDER BY t.start_time ASC LIMIT 20
      `, ['planned']);
      return res.rows;
    } catch (err) {
      fastify.log.error(err, 'Database query failed');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get current user's trips
  fastify.get('/my-trips', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const res = await query('SELECT * FROM trips WHERE creator_id = $1 ORDER BY start_time ASC', [userId]);
      return res.rows;
    } catch (err) {
      fastify.log.error(err, 'Database query failed');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Create a new trip
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { title, description, start_location, end_location, start_time, status } = request.body || {};
    const creator_id = request.user.id;

    try {
      const text = `
        INSERT INTO trips (creator_id, title, description, start_location, end_location, start_time, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        creator_id,
        title || 'Untitled Trip',
        description || '',
        start_location,
        end_location || null,
        start_time || new Date(),
        status || 'planned'
      ];

      const res = await query(text, values);
      reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err, 'Failed to insert trip');
      reply.code(500).send({ error: 'Failed to create trip' });
    }
  });

  // Get a specific trip by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const res = await query('SELECT * FROM trips WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Trip not found' });
      }
      return res.rows[0];
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch trip details');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Update a trip status
  fastify.patch('/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body; // e.g., 'active', 'completed', 'cancelled'
    const userId = request.user.id;

    try {
      const text = `
        UPDATE trips
        SET status = $1
        WHERE id = $2 AND creator_id = $3
        RETURNING *
      `;
      const res = await query(text, [status, id, userId]);

      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Trip not found' });
      }

      reply.code(200).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err, 'Failed to update trip status');
      reply.code(500).send({ error: 'Failed to update trip status' });
    }
  });

  // Delete a trip
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;

    try {
      const text = 'DELETE FROM trips WHERE id = $1 AND creator_id = $2 RETURNING id';
      const res = await query(text, [id, userId]);

      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Trip not found' });
      }

      reply.code(200).send({ success: true, message: 'Trip deleted successfully' });
    } catch (err) {
      fastify.log.error(err, 'Failed to delete trip');
      reply.code(500).send({ error: 'Failed to delete trip' });
    }
  });
}
