import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import { db } from '../../../db/src/db';
import { events, registeredUsers } from '../../../db/src/schemas/events';
import { form, formAnswers, formQuestions } from './../../../db/src/schemas/form';
import { and, eq, sql } from 'drizzle-orm';
const fastify = Fastify({ logger: true });
const PORT = 3124;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register plugins
await fastify.register(cors, {
  origin: 'http://localhost:3024',
  credentials: true,
});

await fastify.register(cookie);

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

    // Validate required fields
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

    // Check if form exists
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

    // Create the question
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

    // Check if form exists
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

    // Fetch all questions for this form, ordered by qorder
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

      // Check if form exists
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

      // Check if question exists
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

      // Delete the question
      await db
        .delete(formQuestions)
        .where(eq(formQuestions.id, parseInt(questionId)));

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

    // Check if form exists
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

    // Check if question exists
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

    // Build update object with only provided fields
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

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0)
    {
      return reply.code(400).send({
        success: false,
        error: 'No fields to update',
      });
    }

    // Update the question
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

      // Get the current question
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

      // Can't move up if already first
      if (currentQuestion.qorder === 1)
      {
        return reply.code(400).send({
          success: false,
          error: 'Question is already at the top',
        });
      }

      // Find the question above (with qorder = current - 1)
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

      // Swap the orders
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

      // Get the current question
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

      // Get total number of questions to check if it's the last one
      const allQuestions = await db.query.formQuestions.findMany({
        where: eq(formQuestions.formId, parseInt(formId)),
      });

      const maxOrder = Math.max(...allQuestions.map(q => q.qorder));

      // Can't move down if already last
      if (currentQuestion.qorder === maxOrder)
      {
        return reply.code(400).send({
          success: false,
          error: 'Question is already at the bottom',
        });
      }

      // Find the question below (with qorder = current + 1)
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

      // Swap the orders
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

    // Validate required fields
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

    // Check if form exists
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

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (name !== undefined)
    {
      updateData.name = name.trim();
    }
    if (description !== undefined)
    {
      updateData.description = description.trim() || null;
    }

    // If no fields to update, return error
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

    // Validate required fields
    if (!title || !startTime || !endTime)
    {
      return reply.status(400).send({
        error: 'Missing required fields: title, startTime, endTime',
      });
    }

    // Create the event in the database
    const newEvent = await db.insert(events).values({
      title,
      description: description || null,
      location: location || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity: capacity || 0,
      isPublic: isPublic !== undefined ? isPublic : true,
      status: status || 'scheduled',
    }).returning();

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

// GET all answers for a specific form with question details
fastify.get<{ Params: { id: string } }>(
  '/api/forms/:id/answers',
  async (request, reply) =>
  {
    try
    {
      const { id } = request.params;

      // Check if form exists
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

      // Get all answers with question details using a join
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
        .innerJoin(
          formQuestions,
          eq(formAnswers.questionId, formQuestions.id)
        )
        .where(eq(formAnswers.formId, parseInt(id)))
        .orderBy(formAnswers.userId, formQuestions.qorder);

      // Group answers by userId to create submissions
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
  }
);

// Local login (for testing without main portal)
fastify.post('/api/auth/local-login', async (request, reply) =>
{
  try
  {
    const { email } = request.body as { email: string };

    if (!email)
    {
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
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Local login error');
    reply.code(500).send({ error: 'Internal server error' });
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
