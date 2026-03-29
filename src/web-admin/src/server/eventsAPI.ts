import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { and, eq, inArray } from 'drizzle-orm';
import { events, eventForms, qrCodes, registeredUsers } from '../../../db/src/schemas/events';
import { form } from '../../../db/src/schemas/form';

// Default registration form template
const DEFAULT_REGISTRATION_FORM = {
  questions: [
    {
      qorder: '1',
      label: 'First Name',
      question_type: 'text_answer',
      options: [],
      required: true
    },
    {
      qorder: '2',
      label: 'Last Name',
      question_type: 'text_answer',
      options: [],
      required: true
    },
    {
      qorder: '3',
      label: 'Email',
      question_type: 'text_answer',
      options: [],
      required: true
    }
  ]
};

export default async function eventsRoutes(fastify: FastifyInstance)
{
  // GET all events
  fastify.get('/api/events', async (request, reply) =>
  {
    try
    {
      const allEvents = await db.query.events.findMany();
      const now = new Date();

      const sortedEvents = allEvents
        .sort((a, b) =>
        {
          const dateA = new Date(a.startTime);
          const dateB = new Date(b.startTime);
          const isAFuture = dateA >= now;
          const isBFuture = dateB >= now;

          if (isAFuture && !isBFuture) return -1;
          if (!isAFuture && isBFuture) return 1;
          if (isAFuture && isBFuture) return dateA.getTime() - dateB.getTime();
          return dateB.getTime() - dateA.getTime();
        })

      return reply.send({ success: true, data: sortedEvents });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch events');
      return reply.code(500).send({ success: false, error: 'Failed to fetch events' });
    }
  });

  // CREATE event
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
        cost,
        registrationForm
      } = request.body as {
        title: string;
        description?: string;
        location?: string;
        startTime: string;
        endTime: string;
        capacity?: number;
        isPublic?: boolean;
        status?: string;
        cost?: number;
        registrationForm?: any;
      };

      if (!title || !startTime || !endTime)
      {
        return reply.status(400).send({ error: 'Missing required fields: title, startTime, endTime' });
      }

      const newEvent = await db.insert(events).values({
        title,
        description: description || null,
        location: location || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacity: capacity || 0,
        isPublic: isPublic !== undefined ? isPublic : true,
        status: status || 'scheduled',
        cost: cost || 0,
        registrationForm: registrationForm || DEFAULT_REGISTRATION_FORM,
      }).returning();

      return reply.status(201).send({ success: true, data: newEvent[0] });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Error creating event');
      return reply.status(500).send({
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update an existing event
  fastify.put<{ Params: { id: string }; Body: Partial<typeof events.$inferInsert> }>(
    '/api/events/:id',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const updateData = request.body;

        const updatedEvent = await db
          .update(events)
          .set({
            ...updateData,
            startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
            endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(events.id, parseInt(id)))
          .returning();

        if (updatedEvent.length === 0)
        {
          return reply.code(404).send({ success: false, error: 'Event not found' });
        }

        return reply.send({
          success: true,
          data: updatedEvent[0],
          message: 'Event updated successfully',
        });
      } catch (error)
      {
        fastify.log.error(error);
        return reply.code(500).send({ success: false, error: 'Failed to update event' });
      }
    }
  );

  fastify.get<{ Params: { id: string }; Querystring: { registrationHash: string } }>(
    '/api/events/:id/qr-registration',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const { registrationHash } = request.query;

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

        if (!registrationHash)
        {
          return reply.code(400).send({ success: false, error: 'registrationHash parameter is required' });
        }

        const registration = await db.query.qrCodes.findFirst({
          where: eq(qrCodes.content, registrationHash.trim())
        });

        return reply.send({ success: true, isRegistered: !!registration, data: registration || null });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to check registration');
        return reply.code(500).send({ success: false, error: 'Failed to check registration' });
      }
    }
  );

  fastify.patch<{ Params: { id: string }; Body: { registrationHash: string } }>(
    '/api/events/:id/qr-check-in',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const { registrationHash } = request.body;

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

        if (!registrationHash)
        {
          return reply.code(400).send({
            success: false,
            error: 'Registration hash (QR code content string) is required'
          }
          );
        }

        const [entry] = await db
          .update(registeredUsers)
          .set({ status: 'attended' })
          .where(
            and(
              eq(registeredUsers.status, 'confirmed'),
              eq(registeredUsers.eventId, parseInt(id)),
              inArray(
                registeredUsers.id,
                db
                  .select({ id: qrCodes.id })
                  .from(qrCodes)
                  .where(
                    and(
                      eq(qrCodes.content, registrationHash),
                      eq(qrCodes.eventId, parseInt(id))
                    )
                  )
              )
            )
          ).returning();

        if (!entry)
        {
          return reply.code(404).send({
            error: 'User has either already checked into the event, or did not register for it.'
          });
        }

        return reply.send({ success: true, isRegistered: !!entry, data: entry || null });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to check registration');
        return reply.code(500).send({ success: false, error: 'Failed to check registration' });
      }
    });

  // "Manual" registration
  fastify.patch<{ Params: { id: string }; Body: { userId: number } }>(
    '/api/events/:id/check-in',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const { userId } = request.body;

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

        const [entry] = await db
          .update(registeredUsers)
          .set({ status: 'attended' })
          .where(
            and(
              eq(registeredUsers.id, userId),
              eq(registeredUsers.status, 'confirmed')
            )
          ).returning();

        if (!entry)
        {
          return reply.code(404).send({
            error: 'User has either already checked into the event, or did not register for it.'
          });
        }

        return reply.send({ success: true, isAttending: !!entry, data: entry || null });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to check registration');
        return reply.code(500).send({ success: false, error: 'Failed to check registration' });
      }
    });

  // Check registration
  fastify.get<{ Params: { id: string }; Querystring: { userEmail: string } }>(
    '/api/events/:id/registration',
    async (request, reply) =>
    {
      // TODO: Allow multiple instances (probably change params)
      try
      {
        const { id } = request.params;
        const { userEmail } = request.query;

        if (!userEmail)
        {
          return reply.code(400).send({ success: false, error: 'userEmail query parameter is required' });
        }

        const registration = await db.query.registeredUsers.findFirst({
          where: and(
            eq(registeredUsers.eventId, parseInt(id)),
            eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
          ),
        });

        return reply.send({ success: true, isRegistered: !!registration, data: registration || null });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to check registration');
        return reply.code(500).send({ success: false, error: 'Failed to check registration' });
      }
    }
  );

  // List registered users
  fastify.get<{ Params: { id: string } }>('/api/events/:id/registrationlist', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;

      const registeredList = await db
        .select()
        .from(registeredUsers)
        .where(eq(registeredUsers.eventId, parseInt(id, 10)));

      return reply.send({ success: true, data: registeredList });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to list registrations');
      return reply.code(500).send({ success: false, error: 'Failed to list registrations' });
    }
  });

  fastify.delete<{ Params: { id: string; registrationId: string } }>(
    '/api/events/:id/registrations/:registrationId',
    async (request, reply) =>
    {
      try
      {
        const { id, registrationId } = request.params;
        const eventId = parseInt(id, 10);
        const parsedRegistrationId = parseInt(registrationId, 10);

        const registration = await db.query.registeredUsers.findFirst({
          where: and(
            eq(registeredUsers.id, parsedRegistrationId),
            eq(registeredUsers.eventId, eventId),
          ),
        });

        if (!registration)
        {
          return reply.code(404).send({
            success: false,
            error: 'Registration not found',
          });
        }

        await db.delete(qrCodes).where(eq(qrCodes.id, parsedRegistrationId));
        await db.delete(registeredUsers).where(eq(registeredUsers.id, parsedRegistrationId));

        return reply.send({
          success: true,
          message: 'Registration removed successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to remove registration');
        return reply.code(500).send({
          success: false,
          error: 'Failed to remove registration',
        });
      }
    },
  );

  // GET event registration form
  fastify.get<{ Params: { id: string } }>('/api/events/:id/registration-form', async (request, reply) =>
  {
    try
    {
      const { id } = request.params;

      const event = await db.query.events.findFirst({
        where: eq(events.id, parseInt(id))
      });

      if (!event)
      {
        return reply.code(404).send({
          success: false,
          error: 'Event not found',
        });
      }

      const registrationForm = event.registrationForm as any;

      if (!registrationForm || !registrationForm.questions)
      {
        return reply.send({
          success: true,
          questions: [],
        });
      }

      // Transform questions to match FormQuestion interface
      const transformedQuestions = registrationForm.questions.map((q: any, index: number) => ({
        id: q.id,
        formId: parseInt(id),
        questionType: q.question_type,
        questionTitle: q.label,
        optionsCategory: q.options?.length > 0 ? JSON.stringify({
          choices: q.options,
          min: q.min,
          max: q.max
        }) : null,
        qorder: index + 1,
        parentQuestionId: null,
        enablingAnswers: [],
        required: q.required || false,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      }));

      return reply.send({
        success: true,
        questions: transformedQuestions,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch event registration form');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch event registration form',
      });
    }
  });

  // UPDATE event registration form
  fastify.put<{ Params: { id: string }; Body: { registrationForm: any } }>(
    '/api/events/:id/registration-form',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const { registrationForm } = request.body;

        if (!registrationForm || !registrationForm.questions)
        {
          return reply.code(400).send({
            success: false,
            error: 'Invalid registration form data',
          });
        }

        const event = await db.query.events.findFirst({
          where: eq(events.id, parseInt(id))
        });

        if (!event)
        {
          return reply.code(404).send({
            success: false,
            error: 'Event not found',
          });
        }

        const updatedEvent = await db
          .update(events)
          .set({
            registrationForm: registrationForm,
            updatedAt: new Date(),
          })
          .where(eq(events.id, parseInt(id)))
          .returning();

        return reply.send({
          success: true,
          data: updatedEvent[0],
          message: 'Registration form updated successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to update registration form');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update registration form',
        });
      }
    }
  );

  // GET forms linked to an event
  fastify.get<{ Params: { id: string } }>('/api/events/:id/forms', async (request, reply) =>
  {
    try
    {
      const eventId = parseInt(request.params.id, 10);

      const linkedForms = await db
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
        .where(eq(eventForms.eventId, eventId));

      return reply.send({
        success: true,
        data: linkedForms,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch linked event forms');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch linked event forms',
      });
    }
  });

  // REPLACE forms linked to an event
  fastify.put<{ Params: { id: string }; Body: { formIds: number[] } }>(
    '/api/events/:id/forms',
    async (request, reply) =>
    {
      try
      {
        const eventId = parseInt(request.params.id, 10);
        const formIds = Array.isArray(request.body?.formIds)
          ? Array.from(new Set(request.body.formIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
          : [];

        const event = await db.query.events.findFirst({
          where: eq(events.id, eventId),
        });

        if (!event)
        {
          return reply.code(404).send({
            success: false,
            error: 'Event not found',
          });
        }

        if (formIds.length > 0)
        {
          const existingForms = await db
            .select({ id: form.id })
            .from(form)
            .where(inArray(form.id, formIds));

          const existingFormIds = new Set(existingForms.map((f) => f.id));
          const missing = formIds.filter((id) => !existingFormIds.has(id));
          if (missing.length > 0)
          {
            return reply.code(400).send({
              success: false,
              error: `Unknown form ids: ${missing.join(', ')}`,
            });
          }
        }

        await db.delete(eventForms).where(eq(eventForms.eventId, eventId));

        if (formIds.length > 0)
        {
          await db.insert(eventForms).values(
            formIds.map((formId) => ({ eventId, formId }))
          );
        }

        return reply.send({
          success: true,
          data: { eventId, formIds },
          message: 'Event form links updated successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to update linked event forms');
        return reply.code(500).send({
          success: false,
          error: 'Failed to update linked event forms',
        });
      }
    }
  );
}
