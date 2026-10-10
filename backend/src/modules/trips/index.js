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

  // Get current user's trips (created by them OR they are an accepted participant)
  fastify.get('/my-trips', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const res = await query(`
        SELECT DISTINCT t.*
        FROM trips t
        LEFT JOIN trip_participants tp ON t.id = tp.trip_id
        WHERE t.creator_id = $1 OR tp.user_id = $1
        ORDER BY t.start_time ASC
      `, [userId]);
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

  // Get incoming trip requests (requests for trips I created)
  fastify.get('/requests/incoming', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const res = await query(`
        SELECT tr.id as request_id, tr.status, tr.created_at,
               t.id as trip_id, t.title, t.start_location, t.end_location, t.start_time,
               u.id as requester_id, u.name as requester_name, u.profile_image_url, u.bike_model
        FROM trip_requests tr
        JOIN trips t ON tr.trip_id = t.id
        JOIN users u ON tr.user_id = u.id
        WHERE t.creator_id = $1 AND tr.status = 'pending'
        ORDER BY tr.created_at DESC
      `, [userId]);
      return res.rows;
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Accept a trip request
  fastify.post('/requests/:requestId/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const { requestId } = request.params;
    const userId = request.user.id;
    try {
      const check = await query(`
        SELECT tr.trip_id, tr.user_id, t.creator_id
        FROM trip_requests tr
        JOIN trips t ON tr.trip_id = t.id
        WHERE tr.id = $1
      `, [requestId]);
      if (check.rows.length === 0) return reply.code(404).send({ error: 'Request not found' });
      if (check.rows[0].creator_id !== userId) return reply.code(403).send({ error: 'Unauthorized' });

      await query(`UPDATE trip_requests SET status = 'accepted' WHERE id = $1`, [requestId]);
      await query(`
        INSERT INTO trip_participants (trip_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [check.rows[0].trip_id, check.rows[0].user_id]);

      await query(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES ($1, 'TRIP_JOIN_ACCEPTED', 'Request Accepted', 'Your request to join a trip was accepted!', $2)
      `, [check.rows[0].user_id, check.rows[0].trip_id]);

      return { success: true };
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Decline a trip request
  fastify.post('/requests/:requestId/decline', { preHandler: [authenticate] }, async (request, reply) => {
    const { requestId } = request.params;
    const userId = request.user.id;
    try {
      const check = await query(`
        SELECT tr.trip_id, tr.user_id, t.creator_id
        FROM trip_requests tr
        JOIN trips t ON tr.trip_id = t.id
        WHERE tr.id = $1
      `, [requestId]);
      if (check.rows.length === 0) return reply.code(404).send({ error: 'Request not found' });
      if (check.rows[0].creator_id !== userId) return reply.code(403).send({ error: 'Unauthorized' });

      await query(`UPDATE trip_requests SET status = 'declined' WHERE id = $1`, [requestId]);
      return { success: true };
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Cancel my trip request
  fastify.post('/requests/:requestId/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { requestId } = request.params;
    const userId = request.user.id;
    try {
      const res = await query(`DELETE FROM trip_requests WHERE id = $1 AND user_id = $2 RETURNING id`, [requestId, userId]);
      if (res.rows.length === 0) return reply.code(404).send({ error: 'Request not found' });
      return { success: true };
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Join a trip
  fastify.post('/:id/join', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    try {
      const tripCheck = await query('SELECT creator_id, status FROM trips WHERE id = $1', [id]);
      if (tripCheck.rows.length === 0) return reply.code(404).send({ error: 'Trip not found' });
      if (tripCheck.rows[0].creator_id === userId) return reply.code(400).send({ error: 'Cannot join your own trip' });
      if (tripCheck.rows[0].status !== 'planned') return reply.code(400).send({ error: 'Trip is not available to join' });

      const existing = await query('SELECT * FROM trip_requests WHERE trip_id = $1 AND user_id = $2', [id, userId]);
      if (existing.rows.length > 0) {
        if (existing.rows[0].status === 'declined') return reply.code(400).send({ error: 'Your request was declined previously' });
        return reply.code(400).send({ error: 'Request already exists' });
      }

      const res = await query(`
        INSERT INTO trip_requests (trip_id, user_id, status) VALUES ($1, $2, 'pending') RETURNING *
      `, [id, userId]);

      await query(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES ($1, 'TRIP_JOIN_REQUEST', 'New Join Request', 'Someone requested to join your trip', $2)
      `, [tripCheck.rows[0].creator_id, id]);

      return res.rows[0];
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get a specific trip by ID
  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    try {
      const res = await query(`
        SELECT t.*, u.name as user_name, u.profile_image_url, u.bike_model
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE t.id = $1
      `, [id]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Trip not found' });
      }

      const trip = res.rows[0];

      // Check request status
      const reqRes = await query(`SELECT id, status FROM trip_requests WHERE trip_id = $1 AND user_id = $2`, [id, userId]);
      trip.join_request = reqRes.rows.length > 0 ? reqRes.rows[0] : null;

      // Get participant count
      const partRes = await query(`SELECT COUNT(*) as count FROM trip_participants WHERE trip_id = $1`, [id]);
      trip.participant_count = parseInt(partRes.rows[0].count, 10);

      return trip;
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch trip details');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get accepted participants for a trip (Squad)
  fastify.get('/:id/participants', async (request, reply) => {
    const { id } = request.params;
    try {
      const res = await query(`
        SELECT u.id, u.name, u.profile_image_url, u.bike_model, tp.joined_at
        FROM trip_participants tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.trip_id = $1
        ORDER BY tp.joined_at ASC
      `, [id]);
      return res.rows;
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get pending join requests for a specific trip (Creator only)
  fastify.get('/:id/requests', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    try {
      const tripCheck = await query('SELECT creator_id FROM trips WHERE id = $1', [id]);
      if (tripCheck.rows.length === 0) return reply.code(404).send({ error: 'Trip not found' });
      if (tripCheck.rows[0].creator_id !== userId) return reply.code(403).send({ error: 'Unauthorized' });

      const res = await query(`
        SELECT tr.id as request_id, u.id as user_id, u.name as requester_name, u.profile_image_url, u.bike_model, tr.created_at
        FROM trip_requests tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.trip_id = $1 AND tr.status = 'pending'
        ORDER BY tr.created_at ASC
      `, [id]);
      return res.rows;
    } catch (err) {
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
