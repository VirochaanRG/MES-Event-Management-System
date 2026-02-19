import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formQuestions, formSubmissions, modularForms } from './../../../db/src/schemas/form';
import { users } from '../../../db/src/schemas/users';
import { and, eq, isNull, sql } from 'drizzle-orm';

export default async function formsRoutes(fastify: FastifyInstance)
{
  // GET all standard forms
  fastify.get('/api/forms', async (request, reply) =>
  {
    try
    {
      const forms = await db.query.form.findMany({
        where:
          isNull(form.moduleId)
      });
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

  // GET all forms including sub-forms
  fastify.get('/api/forms/all', async (request, reply) =>
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

  // GET all modular forms
  fastify.get('/api/mod-forms', async (request, reply) =>
  {
    try
    {
      const forms = await db.query.modularForms.findMany();
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

  // GET all sub-forms for a module
  fastify.get<{ Params: { id: string } }>('/api/mod-forms/sub-forms/:id', async (request, reply) =>
  {
    try
    {
      const moduleId = parseInt(request.params.id);
      const forms = await db.query.form.findMany({
        where: eq(form.moduleId, moduleId)
      });
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

  // GET single modular form by ID
  fastify.get<{ Params: { id: string } }>('/api/mod-forms/:id', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const formData = await db.query.modularForms.findFirst({
        where: eq(modularForms.id, parseInt(id)),
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
    Body: { name: string; description?: string; isModular?: boolean; moduleId?: number; isPublic?: boolean; unlockAt?: string| null };
  }>('/api/forms', async (request, reply) =>
  {
    try
    {
      const { name, description, isModular, moduleId, isPublic, unlockAt } = request.body;

      if (!name || name.trim() === '')
      {
        return reply.code(400).send({
          success: false,
          error: 'Form name is required',
        });
      }
      
      const parsedUnlockAt =
        unlockAt === null || unlockAt === undefined || unlockAt === ""
          ? null
          : new Date(String(unlockAt));

      if (parsedUnlockAt && Number.isNaN(parsedUnlockAt.getTime())) {
        return reply.code(400).send({
          success: false,
          error: "Invalid unlockAt date",
        });
      }

      const newForm = isModular ? 
        await db
        .insert(modularForms)
        .values({
          name: name.trim(),
          description: description?.trim() || null,
        }) 
        : await db 
        .insert(form)
        .values({
          name: name.trim(),
          description: description?.trim() || null,
          moduleId: moduleId,
          isPublic: isPublic ?? false,
          unlockAt: parsedUnlockAt,
        })
        .returning();
      
      return reply.code(201).send({
        success: true,
        data: newForm[0],
      });
    } catch (error)
    {
      console.log(error)
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
    Body: { name?: string; description?: string; moduleId?: number; isPublic?: boolean; unlockAt?: string | null };
  }>('/api/forms/:id', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const { name, description, moduleId, isPublic, unlockAt } = request.body;

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
      if (unlockAt !== undefined) {
        if (unlockAt === null || unlockAt === "") {
          updateData.unlockAt = null;
        } else {
          const parsed = new Date(String(unlockAt));
          if (Number.isNaN(parsed.getTime())) {
            return reply.code(400).send({
              success: false,
              error: "Invalid unlockAt date",
            });
          }
          updateData.unlockAt = parsed;
        }
        updateData.isPublic = false;
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

  // UPDATE a modular form
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; isPublic?: boolean };
  }>('/api/mod-forms/:id', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const { name, description, isPublic } = request.body;

      const existingForm = await db.query.modularForms.findFirst({
        where: eq(modularForms.id, parseInt(id)),
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
        .update(modularForms)
        .set(updateData)
        .where(eq(modularForms.id, parseInt(id)))
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

  // DELETE a modular form
  fastify.delete<{ Params: { id: string } }>('/api/mod-forms/:id', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;

      const existingForm = await db.query.modularForms.findFirst({
        where: eq(modularForms.id, parseInt(id)),
      });

      if (!existingForm)
      {
        return reply.code(404).send({
          success: false,
          error: 'Form not found',
        });
      }

      await db.delete(modularForms).where(eq(form.id, parseInt(id)));

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

  // UPDATE visibility of a form
  fastify.patch<{
  Params: { id: string };
  Body: { isPublic: boolean };
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

  // GET form analytics – all forms with submission counts
  fastify.get('/api/forms/analytics', async (request, reply) =>
  {
    try
    {
      const forms = await db.query.form.findMany({
        where: isNull(form.moduleId),
      });

      const submissionCounts = await db
        .select({
          formId: formSubmissions.formId,
          count: sql<number>`count(*)`,
        })
        .from(formSubmissions)
        .groupBy(formSubmissions.formId);

      const questionCounts = await db
        .select({
          formId: formQuestions.formId,
          count: sql<number>`count(*)`,
        })
        .from(formQuestions)
        .groupBy(formQuestions.formId);

      const subMap = new Map(submissionCounts.map((s) => [s.formId, Number(s.count)]));
      const qMap = new Map(questionCounts.map((q) => [q.formId, Number(q.count)]));

      const data = forms.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        createdAt: f.createdAt,
        isPublic: f.isPublic,
        totalSubmissions: subMap.get(f.id) ?? 0,
        totalQuestions: qMap.get(f.id) ?? 0,
      }));

      const totalForms = data.length;
      const totalSubmissions = data.reduce((sum, f) => sum + f.totalSubmissions, 0);

      return reply.send({
        success: true,
        data: { forms: data, totalForms, totalSubmissions },
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch form analytics');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch form analytics',
      });
    }
  });

  // GET users who completed a specific form
  fastify.get<{ Params: { id: string } }>('/api/forms/:id/completions', async (request, reply) =>
  {
    try
    {
      const formId = parseInt(request.params.id);

      const existingForm = await db.query.form.findFirst({
        where: eq(form.id, formId),
      });

      if (!existingForm)
      {
        return reply.code(404).send({ success: false, error: 'Form not found' });
      }

      const submissions = await db
        .select({
          userId: formSubmissions.userId,
          submittedAt: formSubmissions.createdAt,
        })
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, formId))
        .orderBy(formSubmissions.createdAt);

      // Resolve user emails
      const userIds = [...new Set(submissions.map((s) => s.userId))];
      const userRows = userIds.length
        ? await db.query.users.findMany({
            columns: { id: true, email: true },
          })
        : [];
      const userMap = new Map(userRows.map((u) => [String(u.id), u.email]));

      const completions = submissions.map((s) => ({
        userId: s.userId,
        email: userMap.get(s.userId) ?? s.userId,
        submittedAt: s.submittedAt,
      }));

      return reply.send({
        success: true,
        data: { form: existingForm, completions, totalCompletions: completions.length },
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch form completions');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch form completions',
      });
    }
  });

  // UPDATE visibility of a modular form
  fastify.patch<{
  Params: { id: string };
  Body: { isPublic: boolean };
  }>('/api/mod-forms/:id/visibility', async (request, reply) => {
    const { id } = request.params;
    const { isPublic } = request.body;

    const updated = await db
      .update(modularForms)
      .set({ isPublic })
      .where(eq(modularForms.id, parseInt(id)))
      .returning();

    if (!updated[0]) {
      return reply.code(404).send({ success: false, error: 'Form not found' });
    }

    return reply.send({ success: true, data: updated[0] });
  });

}