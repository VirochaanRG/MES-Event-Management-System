import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';

const fastify = Fastify({ logger: true });
const PORT = 3114;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthUser {
  email: string;
  id?: number;
}

// Mock user database for development
const mockUsers: { [email: string]: AuthUser } = {
  'user@teamd.local': { email: 'user@teamd.local', id: 1 },
  'test@teamd.dev': { email: 'test@teamd.dev', id: 2 },
  'demo@teamd.local': { email: 'demo@teamd.local', id: 3 },
};

function validateUser(email: string): AuthUser | null {
  return mockUsers[email] || null;
}

function generateToken(user: AuthUser): string {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token: string): { user: AuthUser } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: AuthUser };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Register plugins
await fastify.register(cors, {
  origin: 'http://localhost:3014',
  credentials: true,
});

await fastify.register(cookie);

// Auth hook
fastify.decorateRequest('user', null);

fastify.addHook('onRequest', async (request, reply) => {
  const protectedRoutes = ['/api/auth/me', '/api/auth/token'];

  if (protectedRoutes.includes(request.url)) {
    const token = request.cookies['auth-token'];

    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      reply.code(401).send({ error: 'Invalid token' });
      return;
    }

    (request as any).user = decoded.user;
  }
});

// Login endpoint
fastify.post('/api/auth/login', async (request, reply) => {
  try {
    const { email } = request.body as { email: string };

    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const user = validateUser(email);
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    const token = generateToken(user);

    reply.setCookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/'
    });

    reply.send({
      success: true,
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Login error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Logout endpoint
fastify.post('/api/auth/logout', async (request, reply) => {
  reply.clearCookie('auth-token', { path: '/' });
  reply.send({ success: true });
});

// Get current user endpoint
fastify.get('/api/auth/me', async (request, reply) => {
  reply.send({ user: (request as any).user });
});

// Get token endpoint
fastify.get('/api/auth/token', async (request, reply) => {
  const token = request.cookies['auth-token'];
  reply.send({ token });
});

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Team D User server running on http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
