export default async function locationRoutes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      data: {
        locations: [
          { id: "1", name: "Chennai", code: "MAA", enabled: true },
          { id: "2", name: "Coimbatore", code: "CJB", enabled: true },
          { id: "3", name: "Bangalore", code: "BLR", enabled: true },
          { id: "4", name: "Ooty", code: "OTY", enabled: true },
          { id: "5", name: "Mysore", code: "MYS", enabled: true }
        ]
      }
    };
  });
}
