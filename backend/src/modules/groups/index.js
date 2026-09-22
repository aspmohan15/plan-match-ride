import { query } from '../../common/db.js';

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

  // Get pending connection requests (Mocking it to return fake user data for now based on the connections table)
  fastify.get('/connections/pending', async (request, reply) => {
    try {
      // In a real app we would join the users table to get the name.
      // For this demo, we'll return a hardcoded pending request to make testing easy.
      return [
         { id: '101', name: 'Alex Johnson', mutual: '3 mutual friends' }
      ];
    } catch (err) {
      fastify.log.error(err, 'Database query failed for connections');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Leave a group
  fastify.post('/:id/leave', async (request, reply) => {
    const { id } = request.params;
    // In a real app with auth, you'd use the logged-in user's ID to remove them from a group_members table.
    // Since we don't have auth fully wired, we will just return success.
    try {
      fastify.log.info(`User requested to leave group ${id}`);
      return reply.code(200).send({ success: true, message: 'Left group successfully' });
    } catch (err) {
      fastify.log.error(err, 'Failed to leave group');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Accept a connection request
  fastify.post('/connections/:id/accept', async (request, reply) => {
    const { id } = request.params;
    try {
      // In a real app: UPDATE connections SET status = 'accepted' WHERE id = $1
      fastify.log.info(`Accepted connection ${id}`);
      return reply.code(200).send({ success: true, message: 'Connection accepted' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Decline a connection request
  fastify.post('/connections/:id/decline', async (request, reply) => {
    const { id } = request.params;
    try {
      // In a real app: DELETE FROM connections WHERE id = $1
      fastify.log.info(`Declined connection ${id}`);
      return reply.code(200).send({ success: true, message: 'Connection declined' });
    } catch (err) {
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