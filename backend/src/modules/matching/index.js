import { calculateMatchScore } from './engine.js';

export default async function (fastify, opts) {
  fastify.get('/trips/:id/matches', async (request, reply) => {
    const { id } = request.params;

    // Mock user trip for matching
    const userTrip = {
      id,
      destination: 'Lake Tahoe',
      date: '2024-07-20',
      startLocation: 'San Francisco',
      route: 'Hwy 50',
      time: '08:00 AM',
      style: 'Cruiser'
    };

    // Fake pool of trips to match against
    const potentialMatches = [
      {
        id: 'trip-101',
        title: 'Tahoe Weekend Ride',
        destination: 'Lake Tahoe',
        date: '2024-07-20',
        startLocation: 'San Francisco',
        route: 'Hwy 50',
        time: '08:00 AM',
        style: 'Cruiser'
      },
      {
        id: 'trip-102',
        title: 'Yosemite Trip',
        destination: 'Yosemite',
        date: '2024-07-20',
        startLocation: 'San Jose',
        route: 'Hwy 120',
        time: '09:00 AM',
        style: 'Sport'
      },
      {
        id: 'trip-103',
        title: 'Tahoe Run',
        destination: 'Lake Tahoe',
        date: '2024-07-20',
        startLocation: 'Sacramento',
        route: 'Hwy 50',
        time: '08:00 AM',
        style: 'Touring'
      }
    ];

    const matches = potentialMatches.map(trip => {
      const score = calculateMatchScore(userTrip, trip);
      return {
        trip,
        score
      };
    });

    // Sort by highest score first
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  });
}
