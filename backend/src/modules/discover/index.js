import { query } from '../../common/db.js';
import { authenticate } from '../auth/auth.middleware.js';

export default async function (fastify, opts) {
  // 1. Popular Destinations
  fastify.get('/destinations', async (request, reply) => {
    try {
      const { search } = request.query;
      let text = `
        SELECT end_location AS name,
               COUNT(DISTINCT creator_id) AS "riderCount",
               COUNT(id) AS "tripCount"
        FROM trips
        WHERE status IN ('planned', 'active', 'in_progress')
          AND start_time >= CURRENT_TIMESTAMP
          AND end_location IS NOT NULL
          AND creator_id IS NOT NULL
      `;
      let params = [];
      if (search) {
        text += ` AND end_location ILIKE $1`;
        params.push(`%${search}%`);
      }
      text += `
        GROUP BY end_location
        ORDER BY "riderCount" DESC, "tripCount" DESC
      `;
      const res = await query(text, params);
      return { destinations: res.rows.map((row) => ({
        destinationId: row.name,
        name: row.name,
        riderCount: parseInt(row.riderCount, 10),
        tripCount: parseInt(row.tripCount, 10)
      })) };
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch popular destinations');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // 2. My Destination
  fastify.get('/my-destination', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      // Get user's upcoming active trip
      const userTripRes = await query(`
        SELECT end_location
        FROM trips
        WHERE creator_id = $1
          AND status IN ('planned', 'active', 'in_progress')
          AND start_time >= CURRENT_TIMESTAMP
          AND end_location IS NOT NULL
        ORDER BY start_time ASC
        LIMIT 1
      `, [userId]);

      if (userTripRes.rows.length === 0) {
         return { destination: null, trips: [] };
      }

      const destinationName = userTripRes.rows[0].end_location;

      // Get other trips to the same destination
      const otherTripsRes = await query(`
        SELECT t.id, t.title, t.start_location, t.end_location, t.start_time, t.status, t.description,
               u.id as user_id, u.name as user_name, u.profile_image_url,
               u.bike_model, u.bike_image_url
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE t.end_location = $1
          AND t.creator_id != $2
          AND t.status IN ('planned', 'active', 'in_progress')
          AND t.start_time >= CURRENT_TIMESTAMP
        ORDER BY t.start_time ASC
      `, [destinationName, userId]);

      return {
         destination: { id: destinationName, name: destinationName },
         riderCount: otherTripsRes.rows.length,
         trips: otherTripsRes.rows
      };
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch my destination');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // 3. Destination Details
  fastify.get('/destinations/:destinationId', async (request, reply) => {
    const { destinationId } = request.params;
    try {
      const otherTripsRes = await query(`
        SELECT t.id, t.title, t.start_location, t.end_location, t.start_time, t.status, t.description,
               u.id as user_id, u.name as user_name, u.profile_image_url,
               u.bike_model, u.bike_image_url
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE t.end_location = $1
          AND t.status IN ('planned', 'active', 'in_progress')
          AND t.start_time >= CURRENT_TIMESTAMP
        ORDER BY t.start_time ASC
      `, [destinationId]);

      return {
         destination: { id: destinationId, name: destinationId },
         riderCount: otherTripsRes.rows.length,
         trips: otherTripsRes.rows
      };
    } catch(err) {
      fastify.log.error(err, 'Failed to fetch destination details');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // 4. Search Public Trips
  fastify.get('/search', async (request, reply) => {
    const { q } = request.query;
    if (!q) {
        return { riderCount: 0, trips: [] };
    }
    try {
      const tripsRes = await query(`
        SELECT t.id, t.title, t.start_location, t.end_location, t.start_time, t.status, t.description,
               u.id as user_id, u.name as user_name, u.profile_image_url,
               u.bike_model, u.bike_image_url
        FROM trips t
        JOIN users u ON t.creator_id = u.id
        WHERE (t.end_location ILIKE $1 OR t.start_location ILIKE $1)
          AND t.status IN ('planned', 'active', 'in_progress')
          AND t.start_time >= CURRENT_TIMESTAMP
        ORDER BY t.start_time ASC
      `, [`%${q}%`]);

      return {
         riderCount: tripsRes.rows.length,
         trips: tripsRes.rows
      };
    } catch(err) {
      fastify.log.error(err, 'Failed to fetch search results');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
