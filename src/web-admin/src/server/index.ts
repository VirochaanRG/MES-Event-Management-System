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

const fastify = Fastify({ logger: true });
const PORT = 3124;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
  origin: 'http://localhost:3024',
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

// CREATE a form question
fastify.post<{
  Params: { id: string };
  Body: { questionType: string; questionTitle?: string; optionsCategory?: string; qorder: number };
}>('/api/forms/:id/questions', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { questionType, questionTitle, optionsCategory, qorder } = request.body;

    if (!questionType || questionType.trim() === '')
    {
      return reply.code(400).send({
        success: false,
        error: 'Question type is required',
      });
    }

    if (qorder === undefined || qorder === null)
    {
      return reply.code(400).send({
        success: false,
        error: 'Question order (qorder) is required',
      });
    }

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    const newQuestion = await db
      .insert(formQuestions)
      .values({
        formId: parseInt(id),
        questionType: questionType.trim(),
        questionTitle: questionTitle?.trim() || null,
        optionsCategory: optionsCategory?.trim() || null,
        qorder: qorder,
      })
      .returning();

    return reply.code(201).send({
      success: true,
      data: newQuestion[0],
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to create form question');
    return reply.code(500).send({
      success: false,
      error: 'Failed to create form question',
    });
  }
});

// GET all questions for a form
fastify.get<{ Params: { id: string } }>('/api/forms/:id/questions', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    const questions = await db.query.formQuestions.findMany({
      where: eq(formQuestions.formId, parseInt(id)),
      orderBy: (formQuestions, { asc }) => [asc(formQuestions.qorder)],
    });

    return reply.send({
      success: true,
      data: questions,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch questions');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch questions',
    });
  }
});

// DELETE a form question
fastify.delete<{ Params: { formId: string; questionId: string } }>(
  '/api/forms/:formId/questions/:questionId',
  async (request, reply) =>
  {
    try
    {
      const { formId, questionId } = request.params;

      const existingForm = await db.query.form.findFirst({
        where: eq(form.id, parseInt(formId)),
      });

      if (!existingForm)
      {
        return reply.code(404).send({
          success: false,
          error: 'Form not found',
        });
      }

      const existingQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.id, parseInt(questionId)),
          eq(formQuestions.formId, parseInt(formId))
        ),
      });

      if (!existingQuestion)
      {
        return reply.code(404).send({
          success: false,
          error: 'Question not found',
        });
      }

      await db.delete(formQuestions).where(eq(formQuestions.id, parseInt(questionId)));

      return reply.send({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to delete question');
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete question',
      });
    }
  }
);

// PUT/PATCH - Update a form question
fastify.put<{
  Params: { formId: string; questionId: string };
  Body: {
    questionType?: string;
    questionTitle?: string;
    optionsCategory?: string;
    qorder?: number;
  };
}>('/api/forms/:formId/questions/:questionId', async (request, reply) =>
{
  try
  {
    const { formId, questionId } = request.params;
    const { questionType, questionTitle, optionsCategory, qorder } = request.body;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(formId)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    const existingQuestion = await db.query.formQuestions.findFirst({
      where: and(
        eq(formQuestions.id, parseInt(questionId)),
        eq(formQuestions.formId, parseInt(formId))
      ),
    });

    if (!existingQuestion)
    {
      return reply.code(404).send({
        success: false,
        error: 'Question not found',
      });
    }

    const updateData: Record<string, any> = {};

    if (questionType !== undefined)
    {
      updateData.questionType = questionType.trim();
    }
    if (questionTitle !== undefined)
    {
      updateData.questionTitle = questionTitle.trim() || null;
    }
    if (optionsCategory !== undefined)
    {
      updateData.optionsCategory = optionsCategory.trim() || null;
    }
    if (qorder !== undefined)
    {
      updateData.qorder = qorder;
    }

    if (Object.keys(updateData).length === 0)
    {
      return reply.code(400).send({
        success: false,
        error: 'No fields to update',
      });
    }

    const updatedQuestion = await db
      .update(formQuestions)
      .set(updateData)
      .where(eq(formQuestions.id, parseInt(questionId)))
      .returning();

    return reply.send({
      success: true,
      data: updatedQuestion[0],
      message: 'Question updated successfully',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to update question');
    return reply.code(500).send({
      success: false,
      error: 'Failed to update question',
    });
  }
});

// PATCH - Move question up (decrease order)
fastify.patch<{ Params: { formId: string; questionId: string } }>(
  '/api/forms/:formId/questions/:questionId/move-up',
  async (request, reply) =>
  {
    try
    {
      const { formId, questionId } = request.params;

      const currentQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.id, parseInt(questionId)),
          eq(formQuestions.formId, parseInt(formId))
        ),
      });

      if (!currentQuestion)
      {
        return reply.code(404).send({
          success: false,
          error: 'Question not found',
        });
      }

      if (currentQuestion.qorder === 1)
      {
        return reply.code(400).send({
          success: false,
          error: 'Question is already at the top',
        });
      }

      const previousQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.formId, parseInt(formId)),
          eq(formQuestions.qorder, currentQuestion.qorder - 1)
        ),
      });

      if (!previousQuestion)
      {
        return reply.code(404).send({
          success: false,
          error: 'Previous question not found',
        });
      }

      await db
        .update(formQuestions)
        .set({ qorder: currentQuestion.qorder })
        .where(eq(formQuestions.id, previousQuestion.id));

      await db
        .update(formQuestions)
        .set({ qorder: previousQuestion.qorder })
        .where(eq(formQuestions.id, currentQuestion.id));

      return reply.send({
        success: true,
        message: 'Question moved up successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to move question up');
      return reply.code(500).send({
        success: false,
        error: 'Failed to move question up',
      });
    }
  }
);

// PATCH - Move question down (increase order)
fastify.patch<{ Params: { formId: string; questionId: string } }>(
  '/api/forms/:formId/questions/:questionId/move-down',
  async (request, reply) =>
  {
    try
    {
      const { formId, questionId } = request.params;

      const currentQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.id, parseInt(questionId)),
          eq(formQuestions.formId, parseInt(formId))
        ),
      });

      if (!currentQuestion)
      {
        return reply.code(404).send({
          success: false,
          error: 'Question not found',
        });
      }

      const allQuestions = await db.query.formQuestions.findMany({
        where: eq(formQuestions.formId, parseInt(formId)),
      });

      const maxOrder = Math.max(...allQuestions.map((q) => q.qorder));

      if (currentQuestion.qorder === maxOrder)
      {
        return reply.code(400).send({
          success: false,
          error: 'Question is already at the bottom',
        });
      }

      const nextQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.formId, parseInt(formId)),
          eq(formQuestions.qorder, currentQuestion.qorder + 1)
        ),
      });

      if (!nextQuestion)
      {
        return reply.code(404).send({
          success: false,
          error: 'Next question not found',
        });
      }

      await db
        .update(formQuestions)
        .set({ qorder: currentQuestion.qorder })
        .where(eq(formQuestions.id, nextQuestion.id));

      await db
        .update(formQuestions)
        .set({ qorder: nextQuestion.qorder })
        .where(eq(formQuestions.id, currentQuestion.id));

      return reply.send({
        success: true,
        message: 'Question moved down successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to move question down');
      return reply.code(500).send({
        success: false,
        error: 'Failed to move question down',
      });
    }
  }
);

// Simple health check
fastify.get('/api/health', async (request, reply) =>
{
  reply.send({ status: 'ok' });
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

// GET all forms
fastify.get('/api/forms', async (request, reply) =>
{
  try
  {
    const forms = await db.query.form.findMany();
    return reply.send({
      success: true,
      data: forms,
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
    const formData = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!formData)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    return reply.send({
      success: true,
      data: formData,
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

// CREATE a new form
fastify.post<{
  Body: { name: string; description?: string };
}>('/api/forms', async (request, reply) =>
{
  try
  {
    const { name, description } = request.body;

    if (!name || name.trim() === '')
    {
      return reply.code(400).send({
        success: false,
        error: 'Form name is required',
      });
    }

    const newForm = await db
      .insert(form)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    return reply.code(201).send({
      success: true,
      data: newForm[0],
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to create form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to create form',
    });
  }
});

// UPDATE a form
fastify.put<{
  Params: { id: string };
  Body: { name?: string; description?: string };
}>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { name, description } = request.body;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined)
    {
      updateData.name = name.trim();
    }
    if (description !== undefined)
    {
      updateData.description = description.trim() || null;
    }

    if (Object.keys(updateData).length === 0)
    {
      return reply.code(400).send({
        success: false,
        error: 'No fields to update',
      });
    }

    const updatedForm = await db
      .update(form)
      .set(updateData)
      .where(eq(form.id, parseInt(id)))
      .returning();

    return reply.send({
      success: true,
      data: updatedForm[0],
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to update form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to update form',
    });
  }
});

// DELETE a form
fastify.delete<{ Params: { id: string } }>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    await db.delete(form).where(eq(form.id, parseInt(id)));

    return reply.send({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to delete form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to delete form',
    });
  }
});

//Create events
fastify.post('/api/event/create', async (request, reply) =>
{
  try
  {
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      capacity,
      isPublic,
      status,
    } = request.body as {
      title: string;
      description?: string;
      location?: string;
      startTime: string;
      endTime: string;
      capacity?: number;
      isPublic?: boolean;
      status?: string;
    };

    if (!title || !startTime || !endTime)
    {
      return reply.status(400).send({
        error: 'Missing required fields: title, startTime, endTime',
      });
    }

    const newEvent = await db
      .insert(events)
      .values({
        title,
        description: description || null,
        location: location || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacity: capacity || 0,
        isPublic: isPublic !== undefined ? isPublic : true,
        status: status || 'scheduled',
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: newEvent[0],
    });
  } catch (error)
  {
    console.error('Error creating event:', error);
    return reply.status(500).send({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST - Register a user for an event
fastify.post<{
  Params: { id: string };
  Body: { userEmail: string };
}>('/api/events/:id/register', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { userEmail } = request.body;

    if (!userEmail?.trim())
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

// GET - List all registered users for an event
fastify.get<{ Params: { id: string } }>(
  '/api/events/:id/registrationlist',
  async (request, reply) =>
  {
    try
    {
      const { id } = request.params;

      const registeredList = await db
        .select()
        .from(registeredUsers)
        .where(eq(registeredUsers.eventId, parseInt(id, 10)));

      return reply.send({
        success: true,
        data: registeredList,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to list registrations');
      return reply.code(500).send({
        success: false,
        error: 'Failed to list registrations',
      });
    }
  }
);

// GET all answers for a specific form with question details
fastify.get<{ Params: { id: string } }>('/api/forms/:id/answers', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    const answers = await db
      .select({
        answerId: formAnswers.id,
        userId: formAnswers.userId,
        answer: formAnswers.answer,
        createdAt: formAnswers.createdAt,
        questionId: formQuestions.id,
        questionTitle: formQuestions.questionTitle,
        questionType: formQuestions.questionType,
        qorder: formQuestions.qorder,
      })
      .from(formAnswers)
      .innerJoin(formQuestions, eq(formAnswers.questionId, formQuestions.id))
      .where(eq(formAnswers.formId, parseInt(id)))
      .orderBy(formAnswers.userId, formQuestions.qorder);

    const submissionMap = new Map<string, any>();

    answers.forEach((answer) =>
    {
      if (!submissionMap.has(answer.userId))
      {
        submissionMap.set(answer.userId, {
          userId: answer.userId,
          submittedAt: answer.createdAt,
          answers: [],
        });
      }

      submissionMap.get(answer.userId).answers.push({
        questionId: answer.questionId,
        questionTitle: answer.questionTitle,
        questionType: answer.questionType,
        qorder: answer.qorder,
        answer: answer.answer,
      });
    });

    const submissions = Array.from(submissionMap.values());

    return reply.send({
      success: true,
      data: {
        form: existingForm,
        submissions,
        totalSubmissions: submissions.length,
      },
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch form answers');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch form answers',
    });
  }
});

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