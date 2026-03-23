import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../../../db/src/db';
import { events, registeredUsers } from '../../../db/src/schemas/events';
import { users } from '../../../db/src/schemas/users';
import { form, formAnswers, formQuestions } from './../../../db/src/schemas/form';
import { and, eq, sql } from 'drizzle-orm';
import eventsRoutes from './eventsAPI';
import formsRoutes from './formsAPI';
import formBuilderRoutes from './formBuilderAPI';
import imageRoutes from './imagesAPI';

const fastify = Fastify({ logger: true });
const PORT = 3124;
const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key';

interface AuthUser
{
  email: string;
  id: number;
  roles: string[];
}

function generateToken(user: AuthUser): string
{
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token: string): { user: AuthUser } | null
{
  try
  {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: AuthUser };
    return decoded;
  } catch (error)
  {
    return null;
  }
}

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(cookie);

// Auth hook
fastify.decorateRequest('user', null);

fastify.addHook('onRequest', async (request, reply) =>
{
  const protectedRoutes = ['/api/auth/me'];

  if (protectedRoutes.includes(request.url))
  {
    const token = request.cookies['admin-auth-token'];

    if (!token)
    {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded)
    {
      reply.code(401).send({ error: 'Invalid token' });
      return;
    }

    // Verify user has admin role
    if (!decoded.user.roles || !decoded.user.roles.includes('admin'))
    {
      reply.code(403).send({ error: 'Forbidden - Admin access required' });
      return;
    }

    (request as any).user = decoded.user;
  }
});

// Admin Login endpoint
fastify.post('/api/auth/login', async (request, reply) =>
{
  try
  {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password)
    {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user)
    {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch)
    {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Check if user has admin role
    if (!user.roles || !user.roles.includes('admin'))
    {
      return reply.code(403).send({ error: 'Access denied - Admin privileges required' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Set cookie
    reply.setCookie('admin-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    reply.send({
      success: true,
      user: { id: user.id, email: user.email, roles: user.roles },
      token,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Admin login error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Logout endpoint
fastify.post('/api/auth/logout', async (request, reply) =>
{
  reply.clearCookie('admin-auth-token', { path: '/' });
  reply.send({ success: true });
});

// Get current user endpoint
fastify.get('/api/auth/me', async (request, reply) =>
{
  reply.send({ user: (request as any).user });
});



// Simple health check
fastify.get('/api/health', async (request, reply) =>
{
  reply.send({ status: 'ok' });
});


// GET dashboard statistics
fastify.get('/api/dashboard/stats', async (request, reply) =>
{
  try
  {
    // Get total events count
    const eventsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(events);

    // Get total users count (unique registered users)
    const usersCount = await db
      .select({ count: sql<number>`count(DISTINCT email)` })
      .from(users);

    // Get total form responses count
    const formResponsesCount = await db
      .select({ count: sql<number>`count(DISTINCT user_id)` })
      .from(formAnswers);

    return reply.send({
      success: true,
      data: {
        totalEvents: eventsCount[0]?.count || 0,
        totalUsers: usersCount[0]?.count || 0,
        totalFormResponses: formResponsesCount[0]?.count || 0,
      },
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch dashboard stats');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
});

// GET all users
fastify.get('/api/users', async (request, reply) =>
{
  try
  {
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash for security
      },
    });

    return reply.send({
      success: true,
      data: allUsers,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch users');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

// GET single user by ID
fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id)),
      columns: {
        id: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user)
    {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: user,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch user');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

// UPDATE user roles
fastify.put<{
  Params: { id: string };
  Body: { roles: string[] };
}>('/api/users/:id/roles', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { roles } = request.body;

    if (!roles || !Array.isArray(roles))
    {
      return reply.code(400).send({
        success: false,
        error: 'Roles must be an array',
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id)),
    });

    if (!user)
    {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    const updatedUser = await db
      .update(users)
      .set({
        roles: roles,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        email: users.email,
        roles: users.roles,
        updatedAt: users.updatedAt,
      });

    return reply.send({
      success: true,
      data: updatedUser[0],
      message: 'User roles updated successfully',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to update user roles');
    return reply.code(500).send({
      success: false,
      error: 'Failed to update user roles',
    });
  }
});

// DELETE a user
fastify.delete<{ Params: { id: string } }>('/api/users/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id)),
    });

    if (!user)
    {
      return reply.code(404).send({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent deleting yourself
    const token = request.cookies['admin-auth-token'];
    if (token)
    {
      const decoded = verifyToken(token);
      if (decoded && decoded.user.id === parseInt(id))
      {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete your own account',
        });
      }
    }

    await db.delete(users).where(eq(users.id, parseInt(id)));

    return reply.send({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to delete user');
    return reply.code(500).send({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

// GET all unique roles across all users
fastify.get('/api/roles', async (request, reply) =>
{
  try
  {
    const allUsers = await db.query.users.findMany({
      columns: {
        roles: true,
      },
    });

    // Extract all unique roles
    const rolesSet = new Set<string>();
    allUsers.forEach(user =>
    {
      if (user.roles && Array.isArray(user.roles))
      {
        user.roles.forEach(role => rolesSet.add(role));
      }
    });

    const uniqueRoles = Array.from(rolesSet).sort();

    return reply.send({
      success: true,
      data: uniqueRoles,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch roles');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch roles',
    });
  }
});



await fastify.register(eventsRoutes)
await fastify.register(formsRoutes)
await fastify.register(formBuilderRoutes)
await fastify.register(imageRoutes)


// Start server
try
{
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Team D Admin server running on http://localhost:${PORT}`);
} catch (err)
{
  fastify.log.error(err);
  process.exit(1);
}