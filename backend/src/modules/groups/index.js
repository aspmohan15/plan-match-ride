import { query } from '../../common/db.js';
import { authenticate } from '../auth/auth.middleware.js';

export default async function (fastify, opts) {
  // Get all active groups
  fastify.get('/', async (request, reply) => {
    try {
      // Get all groups, along with a count of their members
      const text = `
        SELECT g.*, COUNT(gm.user_id) as member_count
        FROM groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `;
      const res = await query(text);
      return res.rows;
    } catch (err) {
      fastify.log.error(err, 'Database query failed for groups');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get members of a specific group
  fastify.get('/:id/members', async (request, reply) => {
    const { id } = request.params;
    try {
      const text = `
        SELECT u.phone_number, p.full_name, b.make, b.model
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN bikes b ON u.id = b.user_id
        WHERE gm.group_id = $1
        ORDER BY gm.joined_at ASC
      `;
      const res = await query(text, [id]);
      return res.rows;
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch group members');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Create a new group
  fastify.post('/', async (request, reply) => {
    const { name, description } = request.body || {};
    try {
      // In a real app, creator_id would come from the JWT auth token
      const text = 'INSERT INTO groups (name, description, creator_id) VALUES ($1, $2, $3) RETURNING *';
      const res = await query(text, [name, description || '', null]);
      reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err, 'Failed to create group');
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Request a connection
  fastify.post('/connections/:targetUserId/request', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetUserId } = request.params;
    const userId = request.user.id;
    try {
      if (userId == targetUserId) return reply.code(400).send({ error: 'Cannot connect with yourself' });

      const check = await query(`SELECT * FROM connections WHERE user_id_1 = $1 AND user_id_2 = $2`, [userId, targetUserId]);
      if (check.rows.length > 0) return reply.code(400).send({ error: 'Connection already exists or is pending' });

      // Assuming user_id_1 is requester, user_id_2 is target
      await query(`INSERT INTO connections (user_id_1, user_id_2, status) VALUES ($1, $2, 'pending')`, [userId, targetUserId]);

      await query(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES ($1, 'CONNECTION_REQUEST', 'New Connection Request', 'Someone wants to connect with you', $2)
      `, [targetUserId, userId]);

      return { success: true, status: 'pending' };
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get sent connection requests
  fastify.get('/connections/sent', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const text = `
        SELECT u.id as target_id, u.name, u.profile_image_url, u.bike_model
        FROM connections c
        JOIN users u ON c.user_id_2 = u.id
        WHERE c.user_id_1 = $1 AND c.status = 'pending'
      `;
      const res = await query(text, [userId]);
      return res.rows.map(row => ({
        id: row.target_id.toString(),
        name: row.name || 'Anonymous',
        bike: row.bike_model || 'Unknown Bike',
        profile_image: row.profile_image_url
      }));
    } catch (err) {
      fastify.log.error(err, 'Database query failed for connections');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get accepted connections
  fastify.get('/connections/accepted', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const text = `
        SELECT
          u.id as connection_id, u.name, u.profile_image_url, u.bike_model
        FROM connections c
        JOIN users u ON (c.user_id_1 = u.id OR c.user_id_2 = u.id) AND u.id != $1
        WHERE (c.user_id_1 = $1 OR c.user_id_2 = $1) AND c.status = 'accepted'
      `;
      const res = await query(text, [userId]);
      return res.rows.map(row => ({
        id: row.connection_id.toString(),
        name: row.name || 'Anonymous',
        bike: row.bike_model || 'Unknown Bike',
        profile_image: row.profile_image_url
      }));
    } catch (err) {
      fastify.log.error(err, 'Database query failed for connections');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get pending connection requests
  fastify.get('/connections/pending', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const text = `
        SELECT c.user_id_1 as requester_id, u.name, u.profile_image_url, u.bike_model
        FROM connections c
        JOIN users u ON c.user_id_1 = u.id
        WHERE c.user_id_2 = $1 AND c.status = 'pending'
      `;
      const res = await query(text, [userId]);
      return res.rows.map(row => ({
        id: row.requester_id.toString(), // The ID of the user requesting
        name: row.name || 'Anonymous',
        bike: row.bike_model || 'Unknown Bike',
        profile_image: row.profile_image_url
      }));
    } catch (err) {
      fastify.log.error(err, 'Database query failed for connections');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Accept a connection request
  fastify.post('/connections/:requesterId/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const { requesterId } = request.params;
    const userId = request.user.id;
    try {
      await query(`UPDATE connections SET status = 'accepted' WHERE user_id_1 = $1 AND user_id_2 = $2`, [requesterId, userId]);

      await query(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES ($1, 'CONNECTION_ACCEPTED', 'Connection Accepted', 'Your connection request was accepted', $2)
      `, [requesterId, userId]);

      return reply.code(200).send({ success: true, message: 'Connection accepted' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Decline a connection request
  fastify.post('/connections/:requesterId/decline', { preHandler: [authenticate] }, async (request, reply) => {
    const { requesterId } = request.params;
    const userId = request.user.id;
    try {
      await query(`DELETE FROM connections WHERE user_id_1 = $1 AND user_id_2 = $2`, [requesterId, userId]);
      return reply.code(200).send({ success: true, message: 'Connection declined' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Cancel sent connection request
  fastify.post('/connections/:targetUserId/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetUserId } = request.params;
    const userId = request.user.id;
    try {
      await query(`DELETE FROM connections WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'pending'`, [userId, targetUserId]);
      return reply.code(200).send({ success: true, message: 'Connection request cancelled' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Check connection status
  fastify.get('/connections/:targetUserId/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { targetUserId } = request.params;
    const userId = request.user.id;
    try {
      const check1 = await query(`SELECT status FROM connections WHERE user_id_1 = $1 AND user_id_2 = $2`, [userId, targetUserId]);
      if (check1.rows.length > 0) return { status: check1.rows[0].status, direction: 'outgoing' };

      const check2 = await query(`SELECT status FROM connections WHERE user_id_1 = $1 AND user_id_2 = $2`, [targetUserId, userId]);
      if (check2.rows.length > 0) return { status: check2.rows[0].status, direction: 'incoming' };

      return { status: 'none' };
    } catch(err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });// Add a member to a group
  fastify.post('/:id/add_member', async (request, reply) => {
    const { id } = request.params;
    const { user_id } = request.body;

    if (!user_id) {
      return reply.code(400).send({ error: 'User ID is required' });
    }

    try {
      const text = `
        INSERT INTO group_members (group_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      const res = await query(text, [id, user_id]);

      return reply.code(200).send({ success: true, message: 'Member added to group' });
    } catch (err) {
      fastify.log.error(err, 'Failed to add member to group');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}