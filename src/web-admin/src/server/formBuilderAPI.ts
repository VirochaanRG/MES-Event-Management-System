import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formConditions, formQuestions } from './../../../db/src/schemas/form';
import { and, eq, sql } from 'drizzle-orm';


export default async function formBuilderRoutes(fastify: FastifyInstance)
{
  const PROFILE_CONDITION_PREFIX = 'profile:';
  const PROFILE_FIELDS = ['faculty', 'program', 'isMcmasterStudent'] as const;

  const encodeProfileConditionType = (field: string, expectedValue: string) =>
    `${PROFILE_CONDITION_PREFIX}${field}:${encodeURIComponent(expectedValue.trim())}`;

  const parseProfileConditionType = (conditionType: string) =>
  {
    if (!conditionType.startsWith(PROFILE_CONDITION_PREFIX)) return null;

    const rest = conditionType.slice(PROFILE_CONDITION_PREFIX.length);
    const separatorIdx = rest.indexOf(':');
    if (separatorIdx === -1) return null;

    const field = rest.slice(0, separatorIdx);
    const encodedValue = rest.slice(separatorIdx + 1);
    if (!field || !encodedValue) return null;

    return {
      field,
      expectedValue: decodeURIComponent(encodedValue),
    };
  };

  const isProfileCondition = (conditionType: string) =>
    conditionType.startsWith(PROFILE_CONDITION_PREFIX);

  const assertFormUnpublished = async (formId: number, reply: any) =>
  {
    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, formId),
    });

    if (!existingForm)
    {
      reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
      return null;
    }

    if (existingForm.isPublic)
    {
      reply.code(400).send({
        success: false,
        error: 'Unpublish the form before modifying questions',
      });
      return null;
    }

    return existingForm;
  };

  // CREATE a form question
  fastify.post<{
    Params: { id: string };
    Body: { questionType: string; questionTitle?: string; optionsCategory?: string; qorder: number; parentQuestionId?: number; enablingAnswers?: number[]; required: boolean };
  }>('/api/forms/:id/questions', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const { questionType, questionTitle, optionsCategory, qorder, parentQuestionId, enablingAnswers, required } = request.body;

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

      const existingForm = await assertFormUnpublished(parseInt(id), reply);
      if (!existingForm) return;

      const newQuestion = await db
        .insert(formQuestions)
        .values({
          formId: parseInt(id),
          questionType: questionType.trim(),
          questionTitle: questionTitle?.trim() || null,
          optionsCategory: optionsCategory?.trim() || null,
          qorder: qorder,
          parentQuestionId: parentQuestionId || null,
          enablingAnswers: enablingAnswers || [],
          required: required
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

        const existingForm = await assertFormUnpublished(parseInt(formId), reply);
        if (!existingForm) return;

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
      required?: boolean
    };
  }>('/api/forms/:formId/questions/:questionId', async (request, reply) =>
  {
    try
    {
      const { formId, questionId } = request.params;
      const { questionType, questionTitle, optionsCategory, qorder, enablingAnswers, required } = request.body;

      const existingForm = await assertFormUnpublished(parseInt(formId), reply);
      if (!existingForm) return;

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
      if (required !== undefined)
      {
        updateData.required = required;
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

        const existingForm = await assertFormUnpublished(parseInt(formId), reply);
        if (!existingForm) return;

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

        if (currentQuestion.parentQuestionId)
        {
          const parentQuestion = await db.query.formQuestions.findFirst({
            where: and(
              eq(formQuestions.id, parseInt(currentQuestion.parentQuestionId)),
              eq(formQuestions.formId, parseInt(formId))
            ),
          });

          if (parentQuestion && currentQuestion.qorder - parentQuestion.qorder <= 1)
          {
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

        const existingForm = await assertFormUnpublished(parseInt(formId), reply);
        if (!existingForm) return;

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

        if (childQuestion && childQuestion.qorder - currentQuestion.qorder <= 1)
        {
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

  // CREATE a form condition
  fastify.post<{
    Params: { id: string };
    Body: { conditionType: string; dependentFormId: string; dependentQuestionId?: string; dependentAnswerIdx?: number };
  }>('/api/forms/:id/conditions', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const { conditionType, dependentFormId, dependentQuestionId, dependentAnswerIdx } = request.body;

      if (!conditionType || conditionType.trim() === '')
      {
        return reply.code(400).send({
          success: false,
          error: 'Condition type is required',
        });
      }

      if (!dependentFormId)
      {
        return reply.code(400).send({
          success: false,
          error: 'Dependant form is required',
        });
      }

      const existingForm = await db.query.form.findFirst({
        where: eq(form.id, parseInt(id)),
      });

      const dependentForm = await db.query.form.findFirst({
        where: eq(form.id, parseInt(dependentFormId)),
      });

      console.log(existingForm);
      console.log(dependentForm);

      if (!existingForm)
      {
        return reply.code(400).send({
          success: false,
          error: 'Form not found',
        });
      }

      if (!dependentForm)
      {
        return reply.code(400).send({
          success: false,
          error: 'Dependent form not found',
        });
      }

      const conditionTypes = ['complete_form', 'answer_question', 'specific_answer'];

      if (!conditionTypes.includes(conditionType))
      {
        return reply.code(400).send({
          success: false,
          error: 'Invalid condition type',
        });
      }

      const newCondition = await db
        .insert(formConditions)
        .values({
          formId: parseInt(id),
          dependentFormId: parseInt(dependentFormId),
          conditionType: conditionType,
          dependentQuestionId: dependentQuestionId ? parseInt(dependentQuestionId) : null,
          dependentAnswerIdx: dependentAnswerIdx ?? null
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: newCondition[0],
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to create form condition');
      return reply.code(500).send({
        success: false,
        error: 'Failed to create form condition',
      });
    }
  });



  // UPDATE a form condition
  fastify.put<{
    Params: { fid: string, cid: string };
    Body: { dependentFormId: string; dependentQuestionId?: string; dependentAnswerIdx?: number };
  }>('/api/forms/:fid/conditions/:cid', async (request, reply) =>
  {
    try
    {
      const { fid, cid } = request.params;
      const { dependentFormId, dependentQuestionId, dependentAnswerIdx } = request.body;

      if (!dependentFormId)
      {
        return reply.code(400).send({
          success: false,
          error: 'Dependant form is required',
        });
      }

      const existingForm = await db.query.form.findFirst({
        where: eq(form.id, parseInt(fid)),
      });

      const dependentForm = await db.query.form.findFirst({
        where: eq(form.id, parseInt(dependentFormId)),
      });

      if (!existingForm || !dependentForm)
      {
        return reply.code(404).send({
          success: false,
          error: 'Form not found',
        });
      }

      const existingCondition = await db.query.formConditions.findFirst({
        where: eq(formConditions.id, parseInt(cid)),
      });

      if (!existingCondition)
      {
        return reply.code(404).send({
          success: false,
          error: 'Form condition not found',
        });
      }

      const updateData: Record<string, any> = {};

      if (dependentFormId)
      {
        updateData.dependentFormId = parseInt(dependentFormId);
      }
      if (dependentQuestionId)
      {
        updateData.dependentQuestionId = parseInt(dependentQuestionId);
      }
      if (dependentAnswerIdx)
      {
        updateData.dependentAnswerIdx = dependentAnswerIdx;
      }

      if (Object.keys(updateData).length === 0)
      {
        return reply.code(400).send({
          success: false,
          error: 'No fields to update',
        });
      }

      const updatedCondition = await db
        .update(formConditions)
        .set(updateData)
        .where(eq(formConditions.id, parseInt(cid)))
        .returning();

      return reply.send({
        success: true,
        data: updatedCondition[0],
        message: 'Question updated successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to edit form condition');
      return reply.code(500).send({
        success: false,
        error: 'Failed to edit form condition',
      });
    }
  });

  // DELETE a form condition
  fastify.delete<{ Params: { fid: string; cid: string } }>(
    '/api/forms/:fid/conditions/:cid',
    async (request, reply) =>
    {
      try
      {
        const { fid, cid } = request.params;

        const existingForm = await db.query.form.findFirst({
          where: eq(form.id, parseInt(fid)),
        });

        if (!existingForm)
        {
          return reply.code(404).send({
            success: false,
            error: 'Form not found',
          });
        }

        const existingCondition = await db.query.formConditions.findFirst({
          where: and(
            eq(formConditions.id, parseInt(cid)),
            eq(formConditions.formId, parseInt(fid))
          ),
        });

        if (!existingCondition)
        {
          return reply.code(404).send({
            success: false,
            error: 'Condition not found',
          });
        }

        await db.delete(formConditions).where(eq(formConditions.id, parseInt(cid)));

        return reply.send({
          success: true,
          message: 'Condition deleted successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to delete condition');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete condition',
        });
      }
    }
  );

  // GET all conditions for a form
  fastify.get<{ Params: { id: string } }>('/api/forms/:id/conditions', async (request, reply) =>
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

      const conditions = await db.query.formConditions.findMany({
        where: eq(formConditions.formId, parseInt(id))
      });

      return reply.send({
        success: true,
        data: conditions.filter((c) => !isProfileCondition(c.conditionType)),
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

  // GET profile-based access conditions for a form
  fastify.get<{ Params: { id: string } }>('/api/forms/:id/profile-conditions', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const formId = parseInt(id);

      const existingForm = await db.query.form.findFirst({
        where: eq(form.id, formId),
      });

      if (!existingForm)
      {
        return reply.code(404).send({
          success: false,
          error: 'Form not found',
        });
      }

      const allConditions = await db.query.formConditions.findMany({
        where: eq(formConditions.formId, formId),
      });

      const profileConditions = allConditions
        .map((c) =>
        {
          const parsed = parseProfileConditionType(c.conditionType);
          if (!parsed) return null;
          return {
            id: c.id,
            formId: c.formId,
            profileField: parsed.field,
            expectedValue: parsed.expectedValue,
          };
        })
        .filter(Boolean);

      return reply.send({
        success: true,
        data: profileConditions,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch profile conditions');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch profile conditions',
      });
    }
  });

  // CREATE/UPSERT profile-based access condition for a form
  fastify.post<{
    Params: { id: string };
    Body: { profileField: string; expectedValue: string };
  }>('/api/forms/:id/profile-conditions', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;
      const formId = parseInt(id);
      const { profileField, expectedValue } = request.body;

      const normalizedField = profileField?.trim();
      const normalizedValue = expectedValue?.trim();

      if (!normalizedField)
      {
        return reply.code(400).send({
          success: false,
          error: 'Profile field is required',
        });
      }

      if (!normalizedValue)
      {
        return reply.code(400).send({
          success: false,
          error: 'Expected value is required',
        });
      }

      if (!PROFILE_FIELDS.includes(normalizedField as typeof PROFILE_FIELDS[number]))
      {
        return reply.code(400).send({
          success: false,
          error: 'Invalid profile field',
        });
      }

      const existingForm = await assertFormUnpublished(formId, reply);
      if (!existingForm) return;

      const allConditions = await db.query.formConditions.findMany({
        where: eq(formConditions.formId, formId),
      });

      const existingForField = allConditions.find((c) =>
      {
        const parsed = parseProfileConditionType(c.conditionType);
        return parsed?.field === normalizedField;
      });

      const encodedConditionType = encodeProfileConditionType(normalizedField, normalizedValue);

      if (existingForField)
      {
        const [updated] = await db
          .update(formConditions)
          .set({ conditionType: encodedConditionType })
          .where(eq(formConditions.id, existingForField.id))
          .returning();

        return reply.send({
          success: true,
          data: {
            id: updated.id,
            formId: updated.formId,
            profileField: normalizedField,
            expectedValue: normalizedValue,
          },
        });
      }

      const [created] = await db
        .insert(formConditions)
        .values({
          formId,
          // Keep FK valid without schema changes.
          dependentFormId: formId,
          conditionType: encodedConditionType,
          dependentQuestionId: null,
          dependentAnswerIdx: null,
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: {
          id: created.id,
          formId: created.formId,
          profileField: normalizedField,
          expectedValue: normalizedValue,
        },
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to save profile condition');
      return reply.code(500).send({
        success: false,
        error: 'Failed to save profile condition',
      });
    }
  });

  // DELETE profile-based access condition for a form
  fastify.delete<{ Params: { fid: string; cid: string } }>(
    '/api/forms/:fid/profile-conditions/:cid',
    async (request, reply) =>
    {
      try
      {
        const { fid, cid } = request.params;
        const formId = parseInt(fid);
        const conditionId = parseInt(cid);

        const existingForm = await assertFormUnpublished(formId, reply);
        if (!existingForm) return;

        const existingCondition = await db.query.formConditions.findFirst({
          where: and(
            eq(formConditions.id, conditionId),
            eq(formConditions.formId, formId),
          ),
        });

        if (!existingCondition || !isProfileCondition(existingCondition.conditionType))
        {
          return reply.code(404).send({
            success: false,
            error: 'Profile condition not found',
          });
        }

        await db.delete(formConditions).where(eq(formConditions.id, conditionId));

        return reply.send({
          success: true,
          message: 'Profile condition deleted successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to delete profile condition');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete profile condition',
        });
      }
    }
  );
}