import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import { db } from '../../../src/db/src/db';

const JWT_SECRET = 'test-secret-key';
const SALT_ROUNDS = 10;

export async function setupUserServerRoutes() {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, {
    origin: 'http://localhost:3014',
    credentials: true,
  });

  await fastify.register(cookie);

  // ===== Authentication Routes =====
  fastify.post('/api/auth/register', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters long' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.code(400).send({ error: 'Invalid email format' });
      }

      const existingUser = await db.query.users.findFirst({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      const newUser = {
        id: 1,
        email: email.toLowerCase().trim(),
        roles: ['user'],
      };

      const token = jwt.sign({ user: newUser }, JWT_SECRET, { expiresIn: '24h' });

      reply.setCookie('auth-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      reply.code(201).send({
        success: true,
        user: newUser,
        token,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Registration error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      const user = await db.query.users.findFirst({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ user: { id: user.id, email: user.email, roles: user.roles } }, JWT_SECRET, { expiresIn: '24h' });

      reply.setCookie('auth-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      reply.send({
        success: true,
        user: { id: user.id, email: user.email, roles: user.roles },
        token,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Login error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie('auth-token', { path: '/' });
    reply.send({ success: true });
  });

  // ===== Events Routes =====
  fastify.get('/api/events', async (request, reply) => {
    try {
      const allEvents = await db.query.events.findMany();
      return reply.send({
        success: true,
        data: allEvents,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch events',
      });
    }
  });

  fastify.get<{ Params: { id: string } }>('/api/events/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const event = await db.query.events.findFirst({
        where: { id: parseInt(id) },
      });

      if (!event) {
        return reply.code(404).send({
          success: false,
          error: 'Event not found',
        });
      }

      return reply.send({
        success: true,
        data: event,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch event',
      });
    }
  });

  fastify.post<{
    Params: { id: string };
    Body: { userEmail: string; instance?: number; details?: Record<string, any> };
  }>('/api/events/:id/register', async (request, reply) => {
    try {
      const { id } = request.params;
      const { userEmail, instance, details } = request.body;

      if (!userEmail || !userEmail.trim()) {
        return reply.code(400).send({
          success: false,
          error: 'userEmail is required',
        });
      }

      const event = await db.query.events.findFirst({
        where: { id: parseInt(id) },
      });

      if (!event) {
        return reply.code(404).send({
          success: false,
          error: 'Event not found',
        });
      }

      const existingRegistration = await db.query.registeredUsers.findFirst({
        where: {
          eventId: parseInt(id),
          userEmail: userEmail.toLowerCase().trim(),
        },
      });

      if (existingRegistration) {
        return reply.code(400).send({
          success: false,
          error: 'User is already registered for this event',
        });
      }

      const registration = {
        id: 1,
        eventId: parseInt(id),
        userEmail: userEmail.toLowerCase().trim(),
        instance: instance ?? 0,
        status: 'confirmed',
        paymentStatus: 'pending',
      };

      return reply.code(201).send({
        success: true,
        data: registration,
        message: 'Successfully registered for event',
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to register for event',
      });
    }
  });

  // ===== Forms Routes =====
  fastify.get('/api/forms', async (request, reply) => {
    try {
      const allForms = await db.query.form.findMany();
      return reply.send({
        success: true,
        data: allForms,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch forms',
      });
    }
  });

  fastify.get<{ Params: { uid: string } }>('/api/forms/available/:uid', async (request, reply) => {
    try {
      const { uid } = request.params;
      const allForms = await db.query.form.findMany();

      return reply.send({
        success: true,
        data: allForms,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch forms',
      });
    }
  });

  fastify.get<{ Params: { uid: string } }>('/api/forms/completed/:uid', async (request, reply) => {
    try {
      const { uid } = request.params;
      const allForms = await db.query.form.findMany();

      return reply.send({
        success: true,
        data: allForms,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch forms',
      });
    }
  });

  fastify.get<{ Params: { fid: string } }>('/api/forms/:fid', async (request, reply) => {
    try {
      const { fid } = request.params;
      const publicForm = await db.query.form.findFirst({
        where: { id: parseInt(fid) },
      });

      if (!publicForm) {
        return reply.code(404).send({
          success: false,
          error: 'Survey not found',
        });
      }

      return reply.send({
        success: true,
        data: publicForm,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch form',
      });
    }
  });

  fastify.get<{ Params: { fid: string } }>('/api/mod-forms/:fid', async (request, reply) => {
    try {
      const { fid } = request.params;
      const modForm = await db.query.modularForms.findFirst({
        where: { id: parseInt(fid) },
      });

      if (!modForm) {
        return reply.code(404).send({
          success: false,
          error: 'Modular form not found',
        });
      }

      return reply.send({
        success: true,
        data: modForm,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch form',
      });
    }
  });

  fastify.post<{
    Params: { fid: string; uid: string };
    Body: { qid: string; answer: string; questionType: string };
  }>('/api/forms/:fid/answers/:uid', async (request, reply) => {
    try {
      const { fid, uid } = request.params;
      const { qid, answer, questionType } = request.body;

      if (!qid || !answer) {
        return reply.code(400).send({
          success: false,
          error: 'Question ID and answer are required',
        });
      }

      const selectedQuestion = await db.query.formQuestions.findFirst({
        where: { id: parseInt(qid) },
      });

      if (!selectedQuestion) {
        return reply.code(404).send({
          success: false,
          error: 'Question not found',
        });
      }

      const newAnswer = {
        id: 1,
        formId: parseInt(fid),
        userId: uid,
        questionId: parseInt(qid),
        answer: answer,
      };

      return reply.code(201).send({
        success: true,
        data: newAnswer,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to post user answers');
      return reply.code(500).send({
        success: false,
        error: 'Failed to post user answers',
      });
    }
  });

  fastify.patch<{
    Params: { fid: string; uid: string };
  }>('/api/forms/:fid/submit/:uid', async (request, reply) => {
    try {
      const { fid, uid } = request.params;

      const publicForm = await db.query.form.findFirst({
        where: { id: parseInt(fid) },
      });

      if (!publicForm) {
        return reply.code(404).send({
          success: false,
          error: 'Survey not found',
        });
      }

      const submission = {
        id: 1,
        formId: parseInt(fid),
        userId: uid,
        submittedAt: new Date(),
      };

      return reply.code(200).send({
        success: true,
        data: submission,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to submit form');
      return reply.code(500).send({
        success: false,
        error: 'Failed to submit form',
      });
    }
  });

  // ===== Images Routes =====
  fastify.get<{ Params: { eventId: string } }>(
    '/api/images/event/:eventId',
    async (request, reply) => {
      try {
        const { eventId } = request.params;
        const eventIdNum = parseInt(eventId);

        if (isNaN(eventIdNum)) {
          return reply.code(400).send({ success: false, error: 'Invalid event ID' });
        }

        return reply
          .header('Content-Type', 'image/jpeg')
          .header('Cache-Control', 'public, max-age=3600')
          .send(Buffer.from('fake-image-data'));
      } catch (error) {
        return reply.code(500).send({ success: false, error: 'Failed to fetch image' });
      }
    }
  );

  fastify.get<{ Params: { component: string } }>(
    '/api/public/images/:component',
    async (request, reply) => {
      try {
        const result = [
          {
            id: 1,
            fileName: 'image-1.jpg',
            mimeType: 'image/jpeg',
            createdAt: new Date(),
          },
        ];

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch images',
        });
      }
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/public/images/:id/view',
    async (request, reply) => {
      try {
        const { id } = request.params;

        return reply
          .header('Content-Type', 'image/jpeg')
          .header('Content-Length', 15)
          .send(Buffer.from('fake-image-data'));
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: 'Failed to view image',
        });
      }
    }
  );

  await fastify.ready();
  return fastify;
}
