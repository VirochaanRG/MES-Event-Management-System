import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { form, formAnswers, formConditions, formQuestions, formSubmissions, modularForms } from './../../../db/src/schemas/form';
import { profiles, users } from './../../../db/src/schemas/users';
import { eventForms, registeredUsers } from './../../../db/src/schemas/events';
import { and, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';

export default async function formsRoutes(fastify: FastifyInstance)
{

  const PROFILE_CONDITION_PREFIX = 'profile:';

  const splitAllowedValues = (input: string) =>
    input
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);

  const parseProfileConditionType = (conditionType: string) =>
  {
    if (!conditionType.startsWith(PROFILE_CONDITION_PREFIX)) return null;

    const rest = conditionType.slice(PROFILE_CONDITION_PREFIX.length);
    const separatorIdx = rest.indexOf(':');
    if (separatorIdx === -1) return null;

    const profileField = rest.slice(0, separatorIdx);
    const encodedExpected = rest.slice(separatorIdx + 1);
    if (!profileField || !encodedExpected) return null;

    return {
      profileField,
      expectedValue: decodeURIComponent(encodedExpected),
    };
  };

  const resolveProfileByUid = async (uid: string) =>
  {
    // In web-user routes, uid is currently user email.
    const user = await db.query.users.findFirst({
      where: eq(users.email, uid.toLowerCase().trim()),
    });
    if (!user) return null;

    return db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    });
  };

  const isProfileConditionMet = (
    profile: { faculty: string | null; program: string | null; isMcmasterStudent: boolean } | null,
    profileField: string,
    expectedValue: string,
  ) =>
  {
    if (!profile) return false;

    if (profileField === 'faculty')
    {
      const allowed = splitAllowedValues(expectedValue);
      return allowed.includes((profile.faculty ?? '').trim().toLowerCase());
    }

    if (profileField === 'program')
    {
      const allowed = splitAllowedValues(expectedValue);
      return allowed.includes((profile.program ?? '').trim().toLowerCase());
    }

    if (profileField === 'isMcmasterStudent')
    {
      const allowed = splitAllowedValues(expectedValue);
      const normalizedAliases = profile.isMcmasterStudent
        ? ['true', 'yes', '1']
        : ['false', 'no', '0'];

      return allowed.some((v) => normalizedAliases.includes(v));
    }

    return false;
  };

  const canUserAccessFormByProfile = async (uid: string | undefined, fid: number) =>
  {
    const conditions = await db.query.formConditions.findMany({
      where: or(eq(formConditions.formId, fid), eq(formConditions.modFormId, fid)),
    });

    const profileConditions = conditions
      .map((c) => parseProfileConditionType(c.conditionType))
      .filter(Boolean);

    if (profileConditions.length === 0) return true;
    if (!uid) return false;

    const profile = await resolveProfileByUid(uid);
    if (!profile) return false;

    return profileConditions.every((c) =>
      isProfileConditionMet(profile, c!.profileField, c!.expectedValue)
    );
  };

  const filterFormsByProfileAccess = async <T extends { id: number }>(forms: T[], uid: string) =>
  {
    const checks = await Promise.all(
      forms.map(async (f) => ({
        form: f,
        allowed: await canUserAccessFormByProfile(uid, f.id),
      }))
    );

    return checks.filter((c) => c.allowed).map((c) => c.form);
  };

  const canUserAccessFormByEventRegistration = async (uid: string | undefined, fid: number) =>
  {
    const links = await db.query.eventForms.findMany({
      where: eq(eventForms.formId, fid),
    });

    if (links.length === 0) return true;
    if (!uid) return false;

    const eventIds = links.map((link) => link.eventId);
    if (eventIds.length === 0) return true;

    const registration = await db.query.registeredUsers.findFirst({
      where: and(
        eq(registeredUsers.userEmail, uid.toLowerCase().trim()),
        eq(registeredUsers.paymentStatus, 'paid'),
        inArray(registeredUsers.eventId, eventIds),
      ),
    });

    return !!registration;
  };

  const filterFormsByAccess = async <T extends { id: number }>(forms: T[], uid: string) =>
  {
    const checks = await Promise.all(
      forms.map(async (f) => ({
        form: f,
        allowedByProfile: await canUserAccessFormByProfile(uid, f.id),
        allowedByEventRegistration: await canUserAccessFormByEventRegistration(uid, f.id),
      }))
    );

    return checks
      .filter((c) => c.allowedByProfile && c.allowedByEventRegistration)
      .map((c) => c.form);
  };

  const assertProfileCompleted = async (uid: string, reply: any) =>
  {
    const profile = await resolveProfileByUid(uid);
    if (!profile)
    {
      reply.code(403).send({
        success: false,
        error: 'Complete your profile before answering surveys',
      });
      return false;
    }

    return true;
  };

  const assertAccessiblePublicForm = async (fid: string, uid: string | undefined, reply: any) =>
  {
    const f = await db.query.form.findFirst({
      where: and(
        eq(form.id, parseInt(fid)),
        eq(form.isPublic, true),
        sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`
      ),
    });

    if (!f)
    {
      reply.code(404).send({ success: false, error: "Survey not found" });
      return null;
    }

    const allowed = await canUserAccessFormByProfile(uid, f.id);
    const hasEventAccess = await canUserAccessFormByEventRegistration(uid, f.id);
    if (!allowed || !hasEventAccess)
    {
      reply.code(404).send({ success: false, error: "Survey not found" });
      return null;
    }

    return f;
  };

  const checkConditionsMet = async (uid, fid) =>
  {
    const conditions = await db.query.formConditions.findMany({
      where: eq(formConditions.formId, parseInt(fid)),
    });
    if (conditions.length === 0) return true;

    const results = await Promise.all(
      conditions.map(async (c) =>
      {
        if (c.conditionType === 'complete_form')
        {
          if (!c.dependentFormId) return false;
          const submission = await db.query.formSubmissions.findFirst({
            where: and(
              eq(formSubmissions.userId, uid),
              eq(formSubmissions.formId, c.dependentFormId)
            )
          });
          return !!submission;
        }

        else if (c.conditionType === 'answer_question')
        {
          if (!c.dependentFormId) return false;
          if (!c.dependentQuestionId) return false;
          const submission = await db.query.formSubmissions.findFirst({
            where: and(
              eq(formSubmissions.userId, uid),
              eq(formSubmissions.formId, c.dependentFormId)
            )
          });
          if (!submission)
          {
            return false;
          }
          const answer = await db.query.formAnswers.findFirst({
            where: and(
              eq(formAnswers.submissionId, submission.id),
              eq(formAnswers.questionId, c.dependentQuestionId)
            )
          });
          return !!answer;
        }

        else if (c.conditionType === 'specific_answer')
        {
          if (!c.dependentFormId) return false;
          if (!c.dependentQuestionId) return false;
          if (!c.dependentAnswer) return false;
          const submission = await db.query.formSubmissions.findFirst({
            where: and(
              eq(formSubmissions.userId, uid),
              eq(formSubmissions.formId, c.dependentFormId)
            )
          });
          if (!submission)
          {
            return false;
          }
          const answer = await db.query.formAnswers.findFirst({
            where: and(
              eq(formAnswers.submissionId, submission.id),
              eq(formAnswers.questionId, c.dependentQuestionId)
            )
          });

          if (!answer)
          {
            return false;
          }

          const question = await db.query.formQuestions.findFirst({
            where: eq(formQuestions.id, answer.questionId)
          });

          if (!question)
          {
            return false
          }

          if (question.questionType === "multi_select")
          {
            const givenAnswers = JSON.parse(answer.answer ?? "[]");
            return givenAnswers.includes(c.dependentAnswer);
          }
          else if (question.questionType === "multiple_choice" || question.questionType === "dropdown")
          {
            return c.dependentAnswer === answer.answer;
          }
        }
        return true;
      })
    );
    return results.every(Boolean);
  }

  fastify.get('/api/forms', async (request, reply) =>
  {
    try
    {
      const allForms = await db.query.form.findMany({
        where: and(
          eq(form.isPublic, true),
          sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`
        )
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
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
            and(
              notInArray(form.id, submittedIds),
              isNull(form.moduleId))));
      } else
      {
        // If no submissions, return all forms
        allForms = await db
          .select()
          .from(form)
          .where(and(
            eq(form.isPublic, true),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
            isNull(form.moduleId)));
      }

      console.log('UNFILLED: ', allForms);

      const allowedForms = await filterFormsByAccess(allForms, uid);

      return reply.send({
        success: true,
        data: allowedForms,
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
          isPublic: form.isPublic,
          moduleId: form.moduleId
        })
        .from(form)
        .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
        .where(and(
          eq(formSubmissions.userId, uid),
          and(
            eq(form.isPublic, true),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
            isNull(form.moduleId))));

      console.log('FILLED: ', allForms);

      const allowedForms = await filterFormsByAccess(allForms, uid);

      return reply.send({
        success: true,
        data: allowedForms,
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

  fastify.get<{ Params: { eventId: string; uid: string } }>(
    '/api/events/:eventId/forms/available/:uid',
    async (request, reply) =>
    {
      try
      {
        const { eventId, uid } = request.params;
        const parsedEventId = parseInt(eventId, 10);

        const registration = await db.query.registeredUsers.findFirst({
          where: and(
            eq(registeredUsers.eventId, parsedEventId),
            eq(registeredUsers.userEmail, uid.toLowerCase().trim()),
            eq(registeredUsers.paymentStatus, 'paid'),
          ),
        });

        if (!registration)
        {
          return reply.send({
            success: true,
            data: [],
          });
        }

        const eventLinkedForms = await db
          .select({
            id: form.id,
            name: form.name,
            description: form.description,
            createdAt: form.createdAt,
            moduleId: form.moduleId,
            isPublic: form.isPublic,
            unlockAt: form.unlockAt,
          })
          .from(eventForms)
          .innerJoin(form, eq(eventForms.formId, form.id))
          .where(and(
            eq(eventForms.eventId, parsedEventId),
            eq(form.isPublic, true),
            isNull(form.moduleId),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
          ));

        const submittedFormIds = await db
          .select({ formId: formSubmissions.formId })
          .from(formSubmissions)
          .where(eq(formSubmissions.userId, uid));

        const submittedIds = new Set(submittedFormIds.map((s) => s.formId));
        const unsubmitted = eventLinkedForms.filter((f) => !submittedIds.has(f.id));
        const allowedForms = await filterFormsByAccess(unsubmitted, uid);

        return reply.send({
          success: true,
          data: allowedForms,
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to fetch available event-linked forms');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch available event-linked forms',
        });
      }
    }
  );

  fastify.get<{ Params: { eventId: string; uid: string } }>(
    '/api/events/:eventId/forms/completed/:uid',
    async (request, reply) =>
    {
      try
      {
        const { eventId, uid } = request.params;
        const parsedEventId = parseInt(eventId, 10);

        const registration = await db.query.registeredUsers.findFirst({
          where: and(
            eq(registeredUsers.eventId, parsedEventId),
            eq(registeredUsers.userEmail, uid.toLowerCase().trim()),
            eq(registeredUsers.paymentStatus, 'paid'),
          ),
        });

        if (!registration)
        {
          return reply.send({
            success: true,
            data: [],
          });
        }

        const completed = await db
          .select({
            id: form.id,
            name: form.name,
            description: form.description,
            createdAt: form.createdAt,
            isPublic: form.isPublic,
            moduleId: form.moduleId,
          })
          .from(eventForms)
          .innerJoin(form, eq(eventForms.formId, form.id))
          .innerJoin(formSubmissions, eq(formSubmissions.formId, form.id))
          .where(and(
            eq(eventForms.eventId, parsedEventId),
            eq(formSubmissions.userId, uid),
            eq(form.isPublic, true),
            isNull(form.moduleId),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
          ));

        const allowedForms = await filterFormsByAccess(completed, uid);

        return reply.send({
          success: true,
          data: allowedForms,
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to fetch completed event-linked forms');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch completed event-linked forms',
        });
      }
    }
  );

  //GET available modular forms for user
  fastify.get<{ Params: { uid: string } }>('/api/mod-forms/available/:uid', async (request, reply) =>
  {
    try
    {
      const { uid } = request.params;

      // Get all public modular forms
      const allModules = await db
        .select()
        .from(modularForms)
        .where(eq(modularForms.isPublic, true));

      const allowedModules = await filterFormsByProfileAccess(allModules, uid);

      // Filter to only modules that have incomplete forms for this user
      const availableModules = await Promise.all(
        allowedModules.map(async (mod) =>
        {
          // Get all forms in this module that are public and unlocked
          const moduleFormsCount = await db
            .select()
            .from(form)
            .where(and(
              eq(form.moduleId, mod.id),
              eq(form.isPublic, true),
              sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`
            ));

          const accessibleModuleForms = await filterFormsByAccess(moduleFormsCount, uid);

          if (accessibleModuleForms.length === 0)
          {
            // Module has no forms, skip it
            return null;
          }

          const accessibleIds = accessibleModuleForms.map((f) => f.id);
          const submittedAccessible = accessibleIds.length === 0
            ? []
            : await db
              .select({ formId: formSubmissions.formId })
              .from(formSubmissions)
              .where(and(
                eq(formSubmissions.userId, uid),
                inArray(formSubmissions.formId, accessibleIds)
              ));

          // Include only if not all accessible forms have been submitted
          const submittedAccessibleCount = submittedAccessible.length;
          const allFormsSubmitted = accessibleModuleForms.length === submittedAccessibleCount;

          return !allFormsSubmitted ? mod : null;
        })
      );

      const available = availableModules.filter(Boolean);

      return reply.send({
        success: true,
        data: available,
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

  //GET completed modular forms for user
  fastify.get<{ Params: { uid: string } }>('/api/mod-forms/completed/:uid', async (request, reply) =>
  {
    try
    {
      const { uid } = request.params;

      // Get all public modular forms
      const allModules = await db
        .select()
        .from(modularForms)
        .where(eq(modularForms.isPublic, true));

      // For each module, check if all its forms have been submitted
      const completedModules = await Promise.all(
        allModules.map(async (mod) =>
        {
          // Get all forms in this module that are public and unlocked
          const moduleFormsCount = await db
            .select()
            .from(form)
            .where(and(
              eq(form.moduleId, mod.id),
              eq(form.isPublic, true),
              sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`
            ));

          const accessibleModuleForms = await filterFormsByAccess(moduleFormsCount, uid);

          if (accessibleModuleForms.length === 0)
          {
            // Module has no forms, skip it
            return null;
          }

          const accessibleIds = accessibleModuleForms.map((f) => f.id);
          const submittedAccessible = accessibleIds.length === 0
            ? []
            : await db
              .select({ formId: formSubmissions.formId })
              .from(formSubmissions)
              .where(and(
                eq(formSubmissions.userId, uid),
                inArray(formSubmissions.formId, accessibleIds)
              ));

          // Check if all accessible module forms have been submitted
          const submittedAccessibleCount = submittedAccessible.length;
          const allFormsSubmitted = accessibleModuleForms.length === submittedAccessibleCount;

          return allFormsSubmitted ? mod : null;
        })
      );

      const completed = completedModules.filter(Boolean);

      return reply.send({
        success: true,
        data: completed,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch completed modular forms');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch completed modular forms',
      });
    }
  });

  // GET single form by ID
  fastify.get<{ Params: { fid: string }; Querystring: { uid?: string } }>('/api/forms/:fid', async (request, reply) =>
  {
    try
    {
      const { fid } = request.params;
      const { uid } = request.query;

      const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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
        {
          where: and(
            eq(modularForms.isPublic, true),
            eq(modularForms.id, parseInt(fid)))
        }
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
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
            and(
              notInArray(form.id, submittedIds),
              eq(form.moduleId, parseInt(mid))
            )));
      } else
      {
        // If no submissions, return all forms
        allForms = await db
          .select()
          .from(form)
          .where(and(
            eq(form.isPublic, true),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
            eq(form.moduleId, parseInt(mid))));
      }

      const formsToReturn = await Promise.all(
        allForms.map(async (f) =>
        {
          const met = await checkConditionsMet(uid, f.id);
          const profileMet = await canUserAccessFormByProfile(uid, f.id);
          const eventMet = await canUserAccessFormByEventRegistration(uid, f.id);
          return met && profileMet && eventMet ? f : null;
        })
      );

      return reply.send({
        success: true,
        data: formsToReturn.filter(Boolean)
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
          isPublic: form.isPublic
        })
        .from(modularForms)
        .innerJoin(form, eq(form.moduleId, modularForms.id))
        .innerJoin(formSubmissions, eq(form.id, formSubmissions.formId))
        .where(and(
          eq(formSubmissions.userId, uid),
          and(
            eq(form.isPublic, true),
            sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`,
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

  //GET all forms for user and modular form with their status
  fastify.get<{ Params: { mid: string, uid: string } }>('/api/mod-forms/:mid/all/:uid', async (request, reply) =>
  {
    try
    {
      const { mid, uid } = request.params;

      // Get all public forms in the module that are unlocked
      const allFormsInModule = await db
        .select()
        .from(form)
        .where(and(
          eq(form.moduleId, parseInt(mid)),
          eq(form.isPublic, true),
          sql`(form.unlock_at IS NULL OR form.unlock_at <= NOW())`
        ));

      // Get submitted forms for this user
      const submittedFormIds = await db
        .select({ formId: formSubmissions.formId })
        .from(formSubmissions)
        .where(eq(formSubmissions.userId, uid));

      const submittedIds = submittedFormIds.map(s => s.formId);

      // Get all forms in the module (including locked/future)
      const allModuleFormsIncludingLocked = await db
        .select()
        .from(form)
        .where(and(
          eq(form.moduleId, parseInt(mid)),
          eq(form.isPublic, true)
        ));

      // Categorize each form
      const formsWithStatus = await Promise.all(
        allModuleFormsIncludingLocked.map(async (f) =>
        {
          const isSubmitted = submittedIds.includes(f.id);
          const isUnlocked = !f.unlockAt || new Date(f.unlockAt) <= new Date();
          const conditionsMet = isUnlocked ? await checkConditionsMet(uid, f.id) : false;
          const profileMet = isUnlocked ? await canUserAccessFormByProfile(uid, f.id) : false;
          const eventMet = isUnlocked ? await canUserAccessFormByEventRegistration(uid, f.id) : false;
          let status: 'completed' | 'available' | 'locked';

          if (isSubmitted)
          {
            status = 'completed';
          } else if (isUnlocked && conditionsMet && profileMet && eventMet)
          {
            status = 'available';
          } else
          {
            status = 'locked';
          }

          return {
            id: f.id,
            name: f.name,
            description: f.description,
            createdAt: f.createdAt,
            isPublic: f.isPublic,
            status,
          };
        })
      );

      return reply.send({
        success: true,
        data: formsWithStatus,
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

        const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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
  fastify.get<{ Params: { fid: string }; Querystring: { uid?: string } }>('/api/forms/questions/:fid', async (request, reply) =>
  {
    try
    {
      const { fid } = request.params;
      const { uid } = request.query;

      const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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

        const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
        if (!publicForm) return;

        var answers = await db
          .select()
          .from(formAnswers)
          .where(
            and(
              eq(formAnswers.formId, parseInt(fid)),
              eq(formAnswers.userId, uid)
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

      const profileCompleted = await assertProfileCompleted(uid, reply);
      if (!profileCompleted) return;

      const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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

      const profileCompleted = await assertProfileCompleted(uid, reply);
      if (!profileCompleted) return;

      const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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

      const publicForm = await assertAccessiblePublicForm(fid, uid, reply);
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

