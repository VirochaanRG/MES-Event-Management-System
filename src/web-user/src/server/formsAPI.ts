import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formQuestions, formSubmissions, modularForms } from './../../../db/src/schemas/form';
import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';

export default async function formsRoutes(fastify: FastifyInstance)
{

  const assertPublicForm = async (fid: string, reply: any) => {
  const f = await db.query.form.findFirst({
    where: and(eq(form.id, parseInt(fid)), eq(form.isPublic, true)),
  });
  if (!f) {
    reply.code(404).send({ success: false, error: "Survey not found" });
    return null;
  }
  return f;
  };

  fastify.get('/api/forms', async (request, reply) =>
  {
    try
    {
      const allForms = await db.query.form.findMany({
        where: eq(form.isPublic, true)
      });

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

      // Get all form IDs that the user has submitted
      const submittedFormIds = await db
        .select({ formId: formSubmissions.formId })
        .from(formSubmissions)
        .where(eq(formSubmissions.userId, uid));

      const submittedIds = submittedFormIds.map(s => s.formId);

      // Get all forms NOT in the submitted list
      let allForms;
      if (submittedIds.length > 0)
      {
        allForms = await db
          .select()
          .from(form)
          .where(and(
            eq(form.isPublic, true),
            notInArray(form.id, submittedIds)));
      } else
      {
        // If no submissions, return all forms
        allForms = await db
          .select()
          .from(form)
          .where(eq(form.isPublic, true));
      }

      console.log('UNFILLED: ', allForms);

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
        .select()
        .from(form)
        .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
        .where(and(
          eq(formSubmissions.userId, uid),
          and(
            eq(form.isPublic, true),
            isNull(form.moduleId))));

      console.log('FILLED: ', allForms);

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

  //GET available modular forms for user
  fastify.get<{ Params: { uid: string } }>('/api/mod-forms/available/:uid', async (request, reply) =>
  {
    try
    {
      const { uid } = request.params;
      const allForms = await db
        .select()
        .from(modularForms)
        .where(
          eq(modularForms.isPublic, true));

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
      
      const publicForm = await assertPublicForm(fid, reply);
      if (!publicForm) return;

      return reply.send({
        success: true,
        data: publicForm,
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
  fastify.get<{ Params: { fid: string } }>('/api/mod-forms/:fid', async (request, reply) =>
  {
    try
    {
      const { fid } = request.params;
      const form = await db.query.modularForms.findFirst(
        {where: and(
          eq(modularForms.isPublic, true), 
          eq(modularForms.id, parseInt(fid)))}
      );
      return reply.send({
        success: true,
        data: form,
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

  //GET unfilled forms for user and modular form
  fastify.get<{ Params: { mid: string, uid: string } }>('/api/mod-forms/:mid/available/:uid', async (request, reply) =>
  {
    try
    {
      const { mid, uid } = request.params;

      // Get all form IDs that the user has submitted
      const submittedFormIds = await db
        .select({ formId: formSubmissions.formId })
        .from(formSubmissions)
        .where(eq(formSubmissions.userId, uid));

      const submittedIds = submittedFormIds.map(s => s.formId);

      // Get all forms NOT in the submitted list
      let allForms;
      if (submittedIds.length > 0)
      {
        allForms = await db
          .select()
          .from(form)
          .where(and(
            eq(form.isPublic, true),
            and(
              notInArray(form.id, submittedIds),
              eq(form.moduleId, parseInt(mid)))));
      } else
      {
        // If no submissions, return all forms
        allForms = await db
          .select()
          .from(form)
          .where(and(
            eq(form.isPublic, true),
            eq(form.moduleId, parseInt(mid))));
      }

      console.log('UNFILLED: ', allForms);

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
  
  //GET filled forms for user and modular form
  fastify.get<{ Params: { mid: string, uid: string } }>('/api/mod-forms/:mid/completed/:uid', async (request, reply) =>
  {
    try
    {
      const { mid, uid } = request.params;
      const allForms = await db
        .select({
            id: form.id,
            name: form.name,
            description: form.description,
            createdAt: form.createdAt,
            isPublic: form.isPublic,
            moduleId: form.moduleId
            // add other fields you need
          })
        .from(modularForms)
        .innerJoin(form, eq(form.moduleId, modularForms.id))
        .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
        .where(and(
          eq(formSubmissions.userId, uid),
          and(
            eq(form.isPublic, true),
            eq(modularForms.id, parseInt(mid))
          )));

      console.log('FILLED: ', allForms);

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

  // GET status of form for user
  fastify.get<{ Params: { fid: string; uid: string } }>(
    '/api/forms/:fid/status/:uid',
    async (request, reply) =>
    {
      try
      {
        const { fid, uid } = request.params;

        const publicForm = await assertPublicForm(fid, reply);
        if (!publicForm) return;

        console.log('Checking status for:', { fid, uid }); // Debug log

        const submission = await db
          .select()
          .from(formSubmissions)
          .where(
            and(
              eq(formSubmissions.formId, parseInt(fid)),
              eq(formSubmissions.userId, uid)
            )
          )
          .limit(1);

        console.log('Submission found:', submission); // Debug log

        if (!submission || submission.length === 0)
        {
          const answer = await db
            .select()
            .from(formAnswers)
            .where(
              and(
                eq(formAnswers.formId, parseInt(fid)),
                eq(formAnswers.userId, uid)
              )
            )
            .limit(1);

          console.log('Answer found:', answer); // Debug log

          if (!answer || answer.length === 0)
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
        fastify.log.error({ err: error }, 'Failed to fetch form status');
        console.error('Status check error:', error); // Debug log
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch form status',
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

      const publicForm = await assertPublicForm(fid, reply);
      if (!publicForm) return;

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
        
        const publicForm = await assertPublicForm(fid, reply);
        if (!publicForm) return;

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

      const publicForm = await assertPublicForm(fid, reply);
      if (!publicForm) return;

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

      const publicForm = await assertPublicForm(fid, reply);
      if (!publicForm) return;

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

      const publicForm = await assertPublicForm(fid, reply);
      if (!publicForm) return;

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
      fastify.log.error({ err: error }, 'Failed to delete user answers');
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete user answers',
      });
    }
  });
}

