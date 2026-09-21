export default async function (fastify, opts) {

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};

    // Mock authentication logic
    if (email === 'test@example.com' && password === 'password123') {
      return {
        token: 'mock-jwt-token-12345',
        user: {
          id: 1,
          email,
          full_name: 'John Doe',
          riding_style: 'Cruiser'
        }
      };
    }

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid email or password'
    });
  });

  fastify.post('/register', async (request, reply) => {
    const { email, password, full_name } = request.body || {};

    // Mock registration logic
    reply.code(201).send({
      message: 'User registered successfully',
      user: {
        id: 2,
        email,
        full_name
      }
    });
  });
}
