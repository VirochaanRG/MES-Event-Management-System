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
  Body: { questionType: string; questionTitle?: string; optionsCategory?: string; qorder: number; parentQuestionId?: number; enablingAnswers?: number[]};
}>('/api/forms/:id/questions', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { questionType, questionTitle, optionsCategory, qorder, parentQuestionId, enablingAnswers} = request.body;

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
        parentQuestionId: parentQuestionId || null,
        enablingAnswers: enablingAnswers || []
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
    enablingAnswers?: number[];
  };
}>('/api/forms/:formId/questions/:questionId', async (request, reply) =>
{
  try
  {
    const { formId, questionId } = request.params;
    const { questionType, questionTitle, optionsCategory, qorder, enablingAnswers} = request.body;

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
    if (enablingAnswers !== undefined)
    {
      updateData.enablingAnswers = enablingAnswers;
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
      console.log(currentQuestion)

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
      
      if(currentQuestion.parentQuestionId) {
        const parentQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.id, parseInt(currentQuestion.parentQuestionId)),
          eq(formQuestions.formId, parseInt(formId))
        ),
      });
    
      if (parentQuestion && currentQuestion.qorder - parentQuestion.qorder <= 1) {
        return reply.code(400).send({
          success: false,
          error: "Follow-up question cannot be moved above parent question",
        });
      }

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

      const childQuestion = await db.query.formQuestions.findFirst({
        where: and(
          eq(formQuestions.parentQuestionId, parseInt(currentQuestion.id)),
          eq(formQuestions.formId, parseInt(formId))
        ),
      });
    
      if (childQuestion && childQuestion.qorder - currentQuestion.qorder <= 1) {
        return reply.code(400).send({
          success: false,
          error: "Cannot move question below its follow-up",
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

await fastify.register(eventsRoutes)

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