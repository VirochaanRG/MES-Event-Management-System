import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import { db } from '../../../db/src/db';
import { events, registeredUsers } from '../../../db/src/schemas/events';
import { eq, and, sql, isNull, is} from 'drizzle-orm';
import { form, formAnswers, formQuestions, formSubmissions } from '@db/schemas';
import { timeStamp } from 'console';
import { notEqual } from 'assert';
import { parse } from 'path';

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

fastify.post<{
  Params: { id: string };
  Body: { userEmail: string };
}>('/api/events/:id/register', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail } = request.body;

    // Validate required fields
    if (!userEmail || !userEmail.trim())
    {
      return reply.code(400).send({
        success: false,
        error: 'userEmail is required',
      });
    }

    // Check if event exists
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

    // Check if user is already registered
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

    // Check capacity if set
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

    // Register the user
    const eventCost = event.cost ?? 0;
    const registration = await db
      .insert(registeredUsers)
      .values({
        eventId: parseInt(id),
        userEmail: userEmail.toLowerCase().trim(),
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


//Get all forms
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

//GET unfilled forms for user
fastify.get<{ Params: { uid: string } }>('/api/forms/available/:uid', async (request, reply) =>
{
  try
  {
    const {uid} = request.params;
    const allForms = await db
      .select({
        id: form.id,
        name: form.name,
        description: form.description,
        createdAt: form.createdAt,
      })
      .from(form)
      .leftJoin(
        formSubmissions,
        and(
          eq(form.id, formSubmissions.formId),
          eq(formSubmissions.userId, uid)
        )
      )
      .where(sql`${formSubmissions.id} IS NULL`);

    console.log("UNFILLED: " + allForms);

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

//GET filled forms for user
fastify.get<{ Params: { uid: string } }>('/api/forms/completed/:uid', async (request, reply) =>
{
  try
  {
    const {uid} = request.params;
    const allForms = await db.select({
        id: form.id,
        name: form.name,
        description: form.description,
        createdAt: form.createdAt,
      })
      .from(form)
      .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
      .where(eq(formSubmissions.userId, uid));

    console.log("FILLED: " + allForms);

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
fastify.get<{ Params: { fid: string } }>('/api/forms/:fid', async (request, reply) =>
{
  try
  {
    const { fid } = request.params;

    const selectedForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(fid)),
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

// GET status of form for user
fastify.get<{ Params: { fid: string, uid: string } }>('/api/forms/:fid/status/:uid', async (request, reply) =>
{
  try
  {
    const { fid, uid } = request.params;

    const submission = await db.query.formSubmissions.findFirst({
      where: and(eq(formSubmissions.formId, parseInt(fid)), eq(formSubmissions.userId, uid))
    });


    if(!submission) {
      const answer = await db.query.formAnswers.findFirst({
      where: and(eq(formAnswers.formId, parseInt(fid)), eq(formAnswers.userId, uid))});
      if(!answer) {
        return reply.send({
          success: true,
          data: 'unfilled',
        });
      } else {
        return reply.send({
          success: true,
          data: 'started',
        });
      }
    } else {
      return reply.send({
        success: true,
        data: 'completed',
      });
    }

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
fastify.get<{ Params: { fid: string } }>('/api/forms/questions/:fid', async (request, reply) =>
{
  try
  {
    const { fid } = request.params;
    
    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, parseInt(fid)));

    return reply.send({
      success: true,
      data: questions,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch form questions');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch form questions',
    });
  }
});

// GET answers by form ID
fastify.get<{ Params: { fid: string, uid: string }, }>('/api/forms/:fid/answers/:uid', async (request, reply) =>
{
  try
  {
    const { fid, uid } = request.params;

    var answers = await db.select().from(formAnswers).where(
      and(
        eq(formAnswers.formId, parseInt(fid)), 
        eq(formAnswers.userId, uid),
        isNull(formAnswers.submissionId)));
    if(!answers) {
      answers = [];
    }
    return reply.send({
      success: true,
      data: answers,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch user answers');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch user answers',
    });
  }
});

//POST reponse to question
fastify.post<{
  Params: { fid: string, uid : string};
  Body: {qid: string; uid: string, answer: string, questionType: string;};
}>('/api/forms/:fid/answers/:uid', async (request, reply) =>
{
  try
  {
    const {fid, uid} = request.params;
    const {qid, answer, questionType} = request.body;

    const selectedQuestion = await db.query.formQuestions.findFirst({
      where: eq(formQuestions.id, parseInt(qid)),
    });
    if (!selectedQuestion)
    {
      return reply.code(404).send({
        success: false,
        error: 'Question not found',
      });
    }

    const existingAnswer = await db.query.formAnswers.findFirst({where : 
      and(
        eq(formAnswers.questionId, selectedQuestion.id),
        eq(formAnswers.userId, uid))});

    var newAnswer;
    if (existingAnswer) {
      newAnswer = await db
        .update(formAnswers)
        .set({answer : answer})
        .where(eq(formAnswers.id, existingAnswer.id))
        .returning();
    }
    else {
      newAnswer = await db
        .insert(formAnswers)
        .values({
          questionType: questionType.trim(),
          formId: parseInt(fid),
          userId: uid,
          questionId: parseInt(qid),
          answer: answer
        })
        .returning();
    }

    return reply.code(201).send({
      success: true,
      data: newAnswer[0],
    });
  } 
  catch (error){ 
    fastify.log.error({ err: error }, 'Failed to post user answers');
    return reply.code(500).send({
      success: false,
      error: 'Failed to post user answers',
    });
  }
});

//GET completed submission id
fastify.patch<{
  Params: { fid: string, uid : string},
}>('/api/forms/:fid/submit/:uid', async (request, reply) =>
{
  try
  {
    const {fid, uid} = request.params;

    const existingSubmission = await db.query.formSubmissions.findFirst({where : 
      and(
        eq(formSubmissions.formId, parseInt(fid)),
        eq(formSubmissions.userId, uid))});
    
    var submission;
    if(existingSubmission) {
      submission = await db
        .update(formSubmissions)
        .set({updatedAt : sql`NOW()`})
        .where(and(
          eq(formSubmissions.formId, parseInt(fid)),
          eq(formSubmissions.userId, uid)))
        .returning();
      await db
        .update(formAnswers)
        .set({submissionId : submission[0].id})
        .where(and(
          eq(formAnswers.formId, parseInt(fid)), 
          eq(formAnswers.userId, uid),
          isNull(formAnswers.submissionId))
        );
    } else {
      submission = await db
        .insert(formSubmissions)
        .values({
          userId: uid,
          formId: parseInt(fid)
        })
        .returning();
    }

    return reply.code(201).send({
      success: true,
      data: submission,
    });
  } 
  catch (error){ 
    fastify.log.error({ err: error }, 'Failed to post user answers');
    return reply.code(500).send({
      success: false,
      error: 'Failed to post user answers',
    });
  }
});

//DELETE submission and answers
fastify.delete<{
  Params: { fid: string, uid : string},
}>('/api/forms/:fid/delete/:uid', async (request, reply) =>
{
  try
  {
    const {fid, uid} = request.params;

    await db.delete(formSubmissions)
    .where(
      and(
        eq(formSubmissions.userId, uid), 
        eq(formSubmissions.formId, parseInt(fid))));

    await db.delete(formAnswers)
    .where(
      and(
        eq(formAnswers.userId, uid), 
        eq(formAnswers.formId, parseInt(fid))));

    return reply.code(201).send({
      success: true,
      data: {formId: fid, userId: uid}
    });
  } 
  catch (error){ 
    fastify.log.error({ err: error }, 'Failed to post user answers');
    return reply.code(500).send({
      success: false,
      error: 'Failed to post user answers',
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
