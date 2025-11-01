import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';

const fastify = Fastify({ logger: true });
const PORT = 3124;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register plugins
await fastify.register(cors, {
  origin: 'http://localhost:3024',
  credentials: true,
});

await fastify.register(cookie);

// Simple health check
fastify.get('/api/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

// Local login (for testing without main portal)
fastify.post('/api/auth/local-login', async (request, reply) => {
  try {
    const { email } = request.body as { email: string };

    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const user = { id: 1, email };
    const localSecret = 'teamd-local-secret';
    const token = jwt.sign({ user }, localSecret, { expiresIn: '24h' });

    reply.send({
      success: true,
      user,
      token
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Local login error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Team D Admin server running on http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
