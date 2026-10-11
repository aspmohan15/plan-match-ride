import jwt from 'jsonwebtoken';
import { query } from '../../common/db.js';

export async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev');

    // Verify user actually exists in the DB (prevents ghost sessions after DB wipe)
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0) {
       return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'User no longer exists' } });
    }

    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }
}