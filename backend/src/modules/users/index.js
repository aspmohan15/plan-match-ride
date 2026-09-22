import { query } from '../../common/db.js';

export default async function (fastify, opts) {
  // Search for a user by phone number
  fastify.get('/search', async (request, reply) => {
    const { phone } = request.query;
    if (!phone) {
      return reply.code(400).send({ error: 'Phone number is required' });
    }

    try {
      const text = `
        SELECT u.id, u.phone_number, p.full_name, b.make, b.model
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN bikes b ON u.id = b.user_id
        WHERE u.phone_number = $1
      `;
      const res = await query(text, [phone]);

      if (res.rows.length === 0) {
        return reply.code(404).send({ error: 'Biker not found' });
      }

      return res.rows[0];
    } catch (err) {
      fastify.log.error(err, 'Failed to search for user');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
