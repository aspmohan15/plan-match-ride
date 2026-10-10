import jwt from 'jsonwebtoken';

export async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev');

    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }
}