import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import { db } from '../../../db/src/db';
import { events } from '../../../db/src/schemas/events';
import { eq, and, or, max, InferInsertModel } from 'drizzle-orm';
import { form, formQuestions, registeredUsers, qrCodes } from '@db/schemas';
import QRCode from 'qrcode';

const fastify = Fastify({ logger: true });
const PORT = 3114;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthUser
{
  email: string;
  id?: number;
}

// Mock user database for development
const mockUsers: { [email: string]: AuthUser } = {
  'userViro@test.com': { email: 'userViro@test.com', id: 1 },
  'userM@test.com': { email: 'userM@test.com', id: 2 },
  'userI@test.com': { email: 'userI@test.com', id: 3 },
  'userO@test.com': { email: 'userO@test.com', id: 4 },
  'userR@test.com': { email: 'userR@test.com', id: 5 },
};

function validateUser(email: string): AuthUser | null
{
  return mockUsers[email] || null;
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
  origin: 'http://localhost:3014',
  credentials: true,
});

await fastify.register(cookie);

// Auth hook
fastify.decorateRequest('user', null);

fastify.addHook('onRequest', async (request, reply) =>
{
  const protectedRoutes = ['/api/auth/me', '/api/auth/token'];

  if (protectedRoutes.includes(request.url))
  {
    const token = request.cookies['auth-token'];

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

    (request as any).user = decoded.user;
  }
});

// Login endpoint
fastify.post('/api/auth/login', async (request, reply) =>
{
  try
  {
    const { email } = request.body as { email: string };

    if (!email)
    {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const user = validateUser(email);
    if (!user)
    {
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
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Login error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Logout endpoint
fastify.post('/api/auth/logout', async (request, reply) =>
{
  reply.clearCookie('auth-token', { path: '/' });
  reply.send({ success: true });
});

//Get events
fastify.get('/api/events', async (request, reply) =>
{
  try
  {
    const allEvents = await db.query.events.findMany();

    return reply.send({
      success: true,
      data: allEvents,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch events');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// GET single event by ID
fastify.get<{ Params: { id: string } }>('/api/events/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const event = await db.query.events.findFirst({
      where: eq(events.id, parseInt(id)),
    });

    if (!event)
    {
      return reply.code(404).send({
        success: false,
        error: 'Event not found',
      });
    }

    return reply.send({
      success: true,
      data: event,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch event');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch event',
    });
  }
});



//Get forms
fastify.get('/api/forms', async (request, reply) =>
{
  try
  {
    const allForms = await db.query.form.findMany();

    return reply.send({
      success: true,
      data: allForms,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch forms');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch forms',
    });
  }
});

// GET single form by ID
fastify.get<{ Params: { id: string } }>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const selectedForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!selectedForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Survey not found',
      });
    }

    return reply.send({
      success: true,
      data: selectedForm,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch form',
    });
  }
});

// GET questions by form ID
fastify.get<{ Params: { id: string } }>('/api/forms/questions/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const selectedForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });
    if (!selectedForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Survey not found',
      });
    }
    
    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, selectedForm.id));

    return reply.send({
      success: true,
      data: questions,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch form',
    });
  }
});

// Get current user endpoint
fastify.get('/api/auth/me', async (request, reply) =>
{
  reply.send({ user: (request as any).user });
});

// Get token endpoint
fastify.get('/api/auth/token', async (request, reply) =>
{
  const token = request.cookies['auth-token'];
  reply.send({ token });
});

fastify.post("api/events/registration/register", async (request, reply) => {
  try {
    const { eventId, userEmail, instance = 0 } = request.body as {
      eventId: number;
      userEmail: string;
      instance?: number;
    };

    const registration = await db.query.registeredUsers.findFirst({
      where: and(
        eq(registeredUsers.eventId, eventId),
        eq(registeredUsers.userEmail, userEmail),
        eq(registeredUsers.instance, instance),
      )
    });

    if (registration !== null) {
      return reply.code(409).send({ error: "This registration instance already exists in the database"});
    }

    type Entry = InferInsertModel<typeof registeredUsers>;
    const entry = request.body as unknown as Entry;
    const [data] = await db.insert(registeredUsers).values(entry).returning();

    return reply.send({
      success: true,
      entry: data,
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to register user');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

interface QRPayload {
  registrationId: number;
  eventId: number;
  userEmail: string;
  instance: number;
}

function buildQRContentString(payload : QRPayload) {
return `registrationId:${payload.registrationId};eventId:${payload.eventId};userEmail:${payload.userEmail};` +
    `instance:${payload.instance}`;
}

fastify.post("api/events/registration/generateQR", async (request, reply) => {
  try {
    const { registrationId, eventId, userEmail, instance } = request.body as {
      registrationId: number;
      eventId: number;
      userEmail: string;
      instance: number;
    };

    const qrString = buildQRContentString(request.body as QRPayload);
    const qrBuffer = await QRCode.toBuffer(qrString);
    const [entry] = await db.insert(qrCodes).values({
      id: registrationId,
      eventId: eventId,
      userEmail: userEmail,
      instance: instance,
      image: qrBuffer,
      content: qrString
    }).returning();

    return reply.send({
      success: true,
      data: entry,
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to generate QR code');
    return reply.code(500).send({
      success: false,
      error: 'Failed to generate QR code',
    });
  }
});
// Start server
try
{
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Team D User server running on http://localhost:${PORT}`);
} catch (err)
{
  fastify.log.error(err);
  process.exit(1);
}
