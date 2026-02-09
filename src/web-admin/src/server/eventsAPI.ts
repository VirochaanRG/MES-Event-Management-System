import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { and, eq, sql } from 'drizzle-orm';
import { events, registeredUsers } from '../../../db/src/schemas/events';

// Default registration form template
const DEFAULT_REGISTRATION_FORM = {
  questions: [
    {
      qorder: '1',
      question_title: 'First Name',
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
        .slice(0, 3);

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

  // Register for event
  fastify.post<{ Params: { id: string }; Body: { userEmail: string; details?: any } }>(
    '/api/events/:id/register',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;
        const { userEmail, details } = request.body;

        if (!userEmail?.trim())
        {
          return reply.code(400).send({ success: false, error: 'userEmail is required' });
        }

        const event = await db.query.events.findFirst({ where: eq(events.id, parseInt(id)) });

        if (!event)
        {
          return reply.code(404).send({ success: false, error: 'Event not found' });
        }

        const existingRegistration = await db.query.registeredUsers.findFirst({
          where: and(
            eq(registeredUsers.eventId, parseInt(id)),
            eq(registeredUsers.userEmail, userEmail.toLowerCase().trim())
          ),
        });

        if (existingRegistration)
        {
          return reply.code(400).send({ success: false, error: 'User is already registered for this event' });
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
            return reply.code(400).send({ success: false, error: 'Event is at full capacity' });
          }
        }

        const eventCost = event.cost ?? 0;
        const registration = await db.insert(registeredUsers).values({
          eventId: parseInt(id),
          userEmail: userEmail.toLowerCase().trim(),
          status: 'confirmed',
          paymentStatus: eventCost > 0 ? 'pending' : 'paid',
          details: details || null,
        }).returning();

        return reply.code(201).send({ success: true, data: registration[0], message: 'Successfully registered for event' });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Failed to register for event');
        return reply.code(500).send({ success: false, error: 'Failed to register for event' });
      }
    }
  );

  // Check registration
  fastify.get<{ Params: { id: string }; Querystring: { userEmail: string } }>(
    '/api/events/:id/registration',
    async (request, reply) =>
    {
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
}