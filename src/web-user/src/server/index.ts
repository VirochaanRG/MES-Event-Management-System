import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../../../db/src/db';
import { events, registeredUsers } from '../../../db/src/schemas/events';
import { users } from '../../../db/src/schemas/users';
import { eq, and, sql, isNull, or, max } from 'drizzle-orm';
import { form, formQuestions, formAnswers, formSubmissions, qrCodes } from '@db/schemas';
import QRCode from 'qrcode';
import formsRoutes from './formsAPI';
import publicImageRoutes from './imagesAPI';

const fastify = Fastify({ logger: true });
const PORT = 3114;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

interface AuthUser
{
  email: string;
  id: number;
  roles?: string[];
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

// Register endpoint
fastify.post('/api/auth/register', async (request, reply) =>
{
  try
  {
    const { email, password } = request.body as { email: string; password: string };

    // Validation
    if (!email || !password)
    {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    if (password.length < 8)
    {
      return reply.code(400).send({ error: 'Password must be at least 8 characters long' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
    {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser)
    {
      return reply.code(409).send({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        roles: ['user'],
      })
      .returning({
        id: users.id,
        email: users.email,
        roles: users.roles,
      });

    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      roles: newUser.roles,
    });

    // Set cookie
    reply.setCookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    reply.code(201).send({
      success: true,
      user: { id: newUser.id, email: newUser.email, roles: newUser.roles },
      token,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Registration error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Login endpoint
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

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    // Set cookie
    reply.setCookie('auth-token', token, {
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

// ... (rest of your existing endpoints remain the same)

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

// POST - Register user for an event
fastify.post<{
  Params: { id: string };
  Body: { userEmail: string; instance?: number };
}>('/api/events/:id/register', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail, instance } = request.body;

    if (!userEmail || !userEmail.trim())
    {
      return reply.code(400).send({
        success: false,
        error: 'userEmail is required',
      });
    }

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

    // Only single registrations for now
    // TODO: Add functionality to allow for multiple users to register
    const existingRegistration = await db.query.registeredUsers.findFirst({
      where: and(
        eq(registeredUsers.eventId, parseInt(id)),
        eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
      ),
    });

    if (existingRegistration)
    {
      return reply.code(400).send({
        success: false,
        error: 'User is already registered for this event',
      });
    }

    const capacity = event.capacity ?? 0;
    if (capacity > 0)
    {
      const registrationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(registeredUsers)
        .where(eq(registeredUsers.eventId, parseInt(id)));

      const currentCount = registrationCount[0]?.count ?? 0;
      if (currentCount >= capacity)
      {
        return reply.code(400).send({
          success: false,
          error: 'Event is at full capacity',
        });
      }
    }

    const eventCost = event.cost ?? 0;
    const registration = await db
      .insert(registeredUsers)
      .values({
        eventId: parseInt(id),
        userEmail: userEmail.toLowerCase().trim(),
        instance: instance ?? 0,
        status: 'confirmed',
        paymentStatus: eventCost > 0 ? 'pending' : 'paid',
      })
      .returning();

    return reply.code(201).send({
      success: true,
      data: registration[0],
      message: 'Successfully registered for event',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to register for event');
    return reply.code(500).send({
      success: false,
      error: 'Failed to register for event',
    });
  }
});

interface QRPayload
{
  registrationId: number;
  eventId: number;
  userEmail: string;
  instance: number;
}

function buildQRContentString(payload: QRPayload)
{
  return `registrationId:${payload.registrationId};eventId:${payload.eventId};userEmail:${payload.userEmail};` +
    `instance:${payload.instance};${Date.now()}`;
}

fastify.post<{
  Params: { id: string };
  Body: { registrationId: number };
}>('/api/events/:id/generateQR', async (request, reply) =>
{
  try
  {
    const { id: eventParamId } = request.params;
    const { registrationId } = request.body;

    const registration = await db.query.registeredUsers.findFirst({
      where: eq(registeredUsers.id, registrationId),
    });

    if (!registration)
    {
      return reply.code(400).send({
        success: false,
        error: 'Registration not found',
      });
    }

    const eventId = registration.eventId;
    const userEmail = registration.userEmail;
    const instance = registration.instance ?? 0;

    const payload: QRPayload = {
      registrationId,
      eventId,
      userEmail,
      instance,
    };
    const qrString = buildQRContentString(payload);
    const qrSalt = await bcrypt.hash(qrString, SALT_ROUNDS);
    const qrBuffer = await QRCode.toBuffer(qrSalt);
    const [entry] = await db
      .insert(qrCodes)
      .values({
        id: registrationId,
        eventId,
        userEmail,
        instance,
        image: qrBuffer,
        content: qrSalt
      })
      .returning();

    return reply.send({
      success: true,
      data: entry,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to generate QR code');
    return reply.code(500).send({
      success: false,
      error: 'Failed to generate QR code',
    });
  }
});

// GET available events (not started yet and not registered by user)
fastify.get<{
  Querystring: { userEmail?: string };
}>('/api/events/available', async (request, reply) =>
{
  try
  {
    const { userEmail } = request.query;
    const now = new Date();

    // Get all events that haven't started yet
    const upcomingEvents = await db.query.events.findMany({
      where: sql`${events.startTime} > ${now}`,
    });

    // If no userEmail provided, return all upcoming events
    if (!userEmail || !userEmail.trim())
    {
      return reply.send({
        success: true,
        data: upcomingEvents,
      });
    }

    // Get all registrations for this user
    const userRegistrations = await db.query.registeredUsers.findMany({
      where: eq(registeredUsers.userEmail, userEmail.toLowerCase().trim()),
    });

    // Create a set of event IDs the user is already registered for
    const registeredEventIds = new Set(
      userRegistrations.map((reg) => reg.eventId)
    );

    // Filter out events the user is already registered for
    const availableEvents = upcomingEvents.filter(
      (event) => !registeredEventIds.has(event.id)
    );

    return reply.send({
      success: true,
      data: availableEvents,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch available events');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch available events',
    });
  }
});
// GET - Check if a user is registered for an event
fastify.get<{
  Params: { id: string };
  Querystring: { userEmail: string };
}>('/api/events/:id/registration', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail } = request.query;

    if (!userEmail)
    {
      return reply.code(400).send({
        success: false,
        error: 'userEmail query parameter is required',
      });
    }

    const registration = await db.query.registeredUsers.findFirst({
      where: and(
        eq(registeredUsers.eventId, parseInt(id)),
        eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
      ),
    });

    return reply.send({
      success: true,
      isRegistered: !!registration,
      data: registration || null,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to check registration');
    return reply.code(500).send({
      success: false,
      error: 'Failed to check registration',
    });
  }
});

fastify.get<{
  Params: { id: string };
  Querystring: { userEmail: string };
}>('/api/events/:id/event-qrcodes', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail } = request.query;

    const codes = await db
      .select()
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.eventId, parseInt(id)),
          eq(qrCodes.userEmail, userEmail.toLowerCase().trim())
        )
      );

    const data = codes.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      userEmail: c.userEmail,
      instance: c.instance,
      imageBase64: (c.image as any as Buffer).toString('base64'),
    }));

    return reply.send({
      success: true,
      data,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to access DB and fetch QR codes');
    return reply.code(500).send({
      success: false,
      error: 'Failed to access DB and fetch QR codes',
    });
  }
});

fastify.get('/api/events/:id/latest-instance', async (request, reply) =>
{
  try
  {
    const { eventId, userEmail } = request.body as {
      eventId: number;
      userEmail: string;
    };

    const [{ maxInstance }] = await db
      .select({
        maxInstance: max(registeredUsers.instance),
      })
      .from(registeredUsers)
      .where(and(eq(qrCodes.eventId, eventId), eq(qrCodes.userEmail, userEmail)));

    return reply.send({
      success: true,
      instance: maxInstance ?? 0,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to access DB and fetch QR codes');
    return reply.code(500).send({
      success: false,
      error: 'Failed to access DB and fetch QR codes',
    });
  }
});

// GET event registration form
fastify.get<{ Params: { id: string } }>('/api/events/:id/registration-form', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const event = await db.query.events.findFirst({
      where: eq(events.id, parseInt(id))
    });

    if (!event)
    {
      return reply.code(404).send({
        success: false,
        error: 'Event not found',
      });
    }

    const registrationForm = event.registrationForm as any;

    if (!registrationForm || !registrationForm.questions)
    {
      return reply.send({
        success: true,
        questions: [],
      });
    }

    // Transform questions to match FormQuestion interface
    const transformedQuestions = registrationForm.questions.map((q: any, index: number) => ({
      id: q.id,
      formId: parseInt(id),
      questionType: q.question_type,
      questionTitle: q.label,
      optionsCategory: q.options?.length > 0 ? JSON.stringify({
        choices: q.options,
        min: q.min,
        max: q.max
      }) : null,
      qorder: index + 1,
      parentQuestionId: null,
      enablingAnswers: [],
      required: q.required || false,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return reply.send({
      success: true,
      questions: transformedQuestions,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch event registration form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch event registration form',
    });
  }
});

// DELETE - Deregister user from an event
fastify.delete<{
  Params: { id: string };
  Querystring: { userEmail: string };
}>('/api/events/:id/register', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail } = request.query;

    if (!userEmail || !userEmail.trim())
    {
      return reply.code(400).send({
        success: false,
        error: 'userEmail query parameter is required',
      });
    }

    // TODO: Account for multiple registrations
    // Check if the event exists
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

    // Check if the registration exists
    const registration = await db.query.registeredUsers.findFirst({
      where: and(
        eq(registeredUsers.eventId, parseInt(id)),
        eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
      ),
    });

    if (!registration)
    {
      return reply.code(404).send({
        success: false,
        error: 'Registration not found',
      });
    }

    // Delete the QR code (cascade will handle this automatically due to foreign key)
    // But we'll explicitly delete it to be sure
    await db
      .delete(qrCodes)
      .where(eq(qrCodes.id, registration.id));

    // Delete the registration
    await db
      .delete(registeredUsers)
      .where(
        and(
          eq(registeredUsers.eventId, parseInt(id)),
          eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
        )
      );

    return reply.send({
      success: true,
      message: 'Successfully deregistered from event',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to deregister from event');
    return reply.code(500).send({
      success: false,
      error: 'Failed to deregister from event',
    });
  }
});

await fastify.register(formsRoutes)
await fastify.register(publicImageRoutes)


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
