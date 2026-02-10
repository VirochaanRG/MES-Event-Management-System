import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formQuestions } from './../../../db/src/schemas/form';
import { and, eq, sql } from 'drizzle-orm';

export default async function formsRoutes(fastify: FastifyInstance)
{
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

      if (!formData) {
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
  Body: { name: string; description?: string; moduleId?: number; isPublic?: boolean };
}>('/api/forms', async (request, reply) =>
  {
    try
    {
      const { name, description, moduleId, isPublic } = request.body;

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
          moduleId: moduleId ?? null,
          isPublic: isPublic ?? false,
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
    Body: { name?: string; description?: string; moduleId?: number; isPublic?: boolean };
  }>('/api/forms/:id', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const { name, description, moduleId, isPublic } = request.body;

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
      if (moduleId !== undefined) {
        updateData.moduleId = moduleId ?? null;
      }
      if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
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

  fastify.patch<{Params: { id: string }; Body: { isPublic: boolean };
  }>('/api/forms/:id/visibility', async (request, reply) => {
    const { id } = request.params;
    const { isPublic } = request.body;

  const updated = await db
    .update(form)
    .set({ isPublic })
    .where(eq(form.id, parseInt(id)))
    .returning();

  if (!updated[0]) {
    return reply.code(404).send({ success: false, error: 'Form not found' });
  }

  return reply.send({ success: true, data: updated[0] });
});

}