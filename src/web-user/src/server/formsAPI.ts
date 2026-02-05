import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formQuestions, formSubmissions } from './../../../db/src/schemas/form';
import { and, eq, sql } from 'drizzle-orm';

export default async function formsRoutes(fastify: FastifyInstance)
{
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
      const { uid } = request.params;
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
          and(eq(form.id, formSubmissions.formId), eq(formSubmissions.userId, uid))
        )
        .where(sql`${formSubmissions.id} IS NULL`);

      console.log('UNFILLED: ' + allForms);

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
      const { uid } = request.params;
      const allForms = await db
        .select({
          id: form.id,
          name: form.name,
          description: form.description,
          createdAt: form.createdAt,
        })
        .from(form)
        .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
        .where(eq(formSubmissions.userId, uid));

      console.log('FILLED: ' + allForms);

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
  fastify.get<{ Params: { fid: string; uid: string } }>(
    '/api/forms/:fid/status/:uid',
    async (request, reply) =>
    {
      try
      {
        const { fid, uid } = request.params;

        const submission = await db.query.formSubmissions.findFirst({
          where: and(eq(formSubmissions.formId, parseInt(fid)), eq(formSubmissions.userId, uid)),
        });

        if (!submission)
        {
          const answer = await db.query.formAnswers.findFirst({
            where: and(eq(formAnswers.formId, parseInt(fid)), eq(formAnswers.userId, uid)),
          });
          if (!answer)
          {
            return reply.send({
              success: true,
              data: 'unfilled',
            });
          } else
          {
            return reply.send({
              success: true,
              data: 'started',
            });
          }
        } else
        {
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
    }
  );

  // GET questions by form ID
  fastify.get<{ Params: { fid: string } }>('/api/forms/questions/:fid', async (request, reply) =>
  {
    try
    {
      const { fid } = request.params;

      const questions = await db
        .select()
        .from(formQuestions)
        .where(eq(formQuestions.formId, parseInt(fid)));

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
  fastify.get<{ Params: { fid: string; uid: string } }>(
    '/api/forms/:fid/answers/:uid',
    async (request, reply) =>
    {
      try
      {
        const { fid, uid } = request.params;

        var answers = await db
          .select()
          .from(formAnswers)
          .where(
            and(
              eq(formAnswers.formId, parseInt(fid)),
              eq(formAnswers.userId, uid),
              isNull(formAnswers.submissionId)
            )
          );
        if (!answers)
        {
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
    }
  );

  //POST reponse to question
  fastify.post<{
    Params: { fid: string; uid: string };
    Body: { qid: string; uid: string; answer: string; questionType: string };
  }>('/api/forms/:fid/answers/:uid', async (request, reply) =>
  {
    try
    {
      const { fid, uid } = request.params;
      const { qid, answer, questionType } = request.body;

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

      const existingAnswer = await db.query.formAnswers.findFirst({
        where: and(eq(formAnswers.questionId, selectedQuestion.id), eq(formAnswers.userId, uid)),
      });

      var newAnswer;
      if (existingAnswer)
      {
        newAnswer = await db
          .update(formAnswers)
          .set({ answer: answer })
          .where(eq(formAnswers.id, existingAnswer.id))
          .returning();
      } else
      {
        newAnswer = await db
          .insert(formAnswers)
          .values({
            questionType: questionType.trim(),
            formId: parseInt(fid),
            userId: uid,
            questionId: parseInt(qid),
            answer: answer,
          })
          .returning();
      }

      return reply.code(201).send({
        success: true,
        data: newAnswer[0],
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to post user answers');
      return reply.code(500).send({
        success: false,
        error: 'Failed to post user answers',
      });
    }
  });

  //GET completed submission id
  fastify.patch<{
    Params: { fid: string; uid: string };
  }>('/api/forms/:fid/submit/:uid', async (request, reply) =>
  {
    try
    {
      const { fid, uid } = request.params;

      const existingSubmission = await db.query.formSubmissions.findFirst({
        where: and(eq(formSubmissions.formId, parseInt(fid)), eq(formSubmissions.userId, uid)),
      });

      var submission;
      if (existingSubmission)
      {
        submission = await db
          .update(formSubmissions)
          .set({ updatedAt: sql`NOW()` })
          .where(and(eq(formSubmissions.formId, parseInt(fid)), eq(formSubmissions.userId, uid)))
          .returning();
        await db
          .update(formAnswers)
          .set({ submissionId: submission[0].id })
          .where(
            and(
              eq(formAnswers.formId, parseInt(fid)),
              eq(formAnswers.userId, uid),
              isNull(formAnswers.submissionId)
            )
          );
      } else
      {
        submission = await db
          .insert(formSubmissions)
          .values({
            userId: uid,
            formId: parseInt(fid),
          })
          .returning();
      }

      return reply.code(201).send({
        success: true,
        data: submission,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to post user answers');
      return reply.code(500).send({
        success: false,
        error: 'Failed to post user answers',
      });
    }
  });

  //DELETE submission and answers
  fastify.delete<{
    Params: { fid: string; uid: string };
  }>('/api/forms/:fid/delete/:uid', async (request, reply) =>
  {
    try
    {
      const { fid, uid } = request.params;

      await db
        .delete(formSubmissions)
        .where(and(eq(formSubmissions.userId, uid), eq(formSubmissions.formId, parseInt(fid))));

      await db
        .delete(formAnswers)
        .where(and(eq(formAnswers.userId, uid), eq(formAnswers.formId, parseInt(fid))));

      return reply.code(201).send({
        success: true,
        data: { formId: fid, userId: uid },
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to post user answers');
      return reply.code(500).send({
        success: false,
        error: 'Failed to post user answers',
      });
    }
  });
}

