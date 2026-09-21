import { query } from '../../common/db.js';

export default async function (fastify, opts) {
  // Get all active groups
  fastify.get('/', async (request, reply) => {
    try {
      const res = await query('SELECT * FROM groups ORDER BY created_at DESC');
      return res.rows;
    } catch (err) {
      fastify.log.error(err, 'Database query failed for groups');
      return reply.code(500).send({ error: 'Internal Server Error' });
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
  });
}