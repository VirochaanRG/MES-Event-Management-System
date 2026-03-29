import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { eq, and, inArray } from 'drizzle-orm';
import { announcements, events, registeredUsers } from '../../../db/src/schemas/events';
import { pushTokens } from '../../../db/src/schemas/users';

async function sendExpoPushNotifications(tokens: string[], title: string, body: string)
{
  if (tokens.length === 0) return;
  // Expo push API accepts batches of up to 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE)
  {
    const batch = tokens.slice(i, i + BATCH_SIZE).map(to => ({
      to,
      title,
      body,
      sound: 'default',
    }));
    try
    {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (err)
    {
      console.error('Failed to send Expo push batch', err);
    }
  }
}

export default async function announcementsRoutes(fastify: FastifyInstance)
{
  // GET all announcements (admin)
  fastify.get('/api/announcements', async (request, reply) =>
  {
    try
    {
      const allAnnouncements = await db.query.announcements.findMany({
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });

      // Enrich with event title if eventId is present
      const eventIds = allAnnouncements
        .map(a => a.eventId)
        .filter((id): id is number => id !== null);

      let eventMap: Record<number, string> = {};
      if (eventIds.length > 0)
      {
        const linkedEvents = await db.query.events.findMany({
          where: (e, { inArray }) => inArray(e.id, eventIds),
          columns: { id: true, title: true },
        });
        eventMap = Object.fromEntries(linkedEvents.map(e => [e.id, e.title]));
      }

      return reply.send({
        success: true,
        data: allAnnouncements.map(a => ({
          ...a,
          eventTitle: a.eventId != null ? (eventMap[a.eventId] ?? null) : null,
        })),
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch announcements');
      return reply.code(500).send({ success: false, error: 'Failed to fetch announcements' });
    }
  });

  // POST create announcement (admin)
  fastify.post<{
    Body: { title: string; body: string; eventId?: number | null };
  }>('/api/announcements', async (request, reply) =>
  {
    try
    {
      const { title, body, eventId } = request.body;

      if (!title?.trim() || !body?.trim())
      {
        return reply.code(400).send({ success: false, error: 'title and body are required' });
      }

      // If eventId provided, verify event exists
      if (eventId != null)
      {
        const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
        if (!event)
        {
          return reply.code(404).send({ success: false, error: 'Event not found' });
        }
      }

      const [created] = await db
        .insert(announcements)
        .values({ title: title.trim(), body: body.trim(), eventId: eventId ?? null })
        .returning();

      // Send push notifications to relevant users (fire-and-forget)
      (async () =>
      {
        try
        {
          let targetEmails: string[];
          if (eventId != null)
          {
            // Event-specific: notify users registered (paid) for this event
            const registrations = await db.query.registeredUsers.findMany({
              where: and(
                eq(registeredUsers.eventId, eventId),
                eq(registeredUsers.paymentStatus, 'paid'),
              ),
              columns: { userEmail: true },
            });
            targetEmails = registrations.map(r => r.userEmail);
          } else
          {
            // General announcement: notify all users with registered tokens
            const allTokens = await db.query.pushTokens.findMany({
              columns: { token: true },
            });
            const tokens = allTokens.map(t => t.token);
            await sendExpoPushNotifications(tokens, created.title, created.body);
            return;
          }

          if (targetEmails.length > 0)
          {
            const tokenRows = await db.query.pushTokens.findMany({
              where: inArray(pushTokens.userEmail, targetEmails),
              columns: { token: true },
            });
            await sendExpoPushNotifications(tokenRows.map(t => t.token), created.title, created.body);
          }
        } catch (err)
        {
          console.error('Push notification dispatch error', err);
        }
      })();

      return reply.code(201).send({ success: true, data: created });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to create announcement');
      return reply.code(500).send({ success: false, error: 'Failed to create announcement' });
    }
  });

  // DELETE announcement (admin)
  fastify.delete<{ Params: { id: string } }>('/api/announcements/:id', async (request, reply) =>
  {
    try
    {
      const id = parseInt(request.params.id);
      if (isNaN(id))
      {
        return reply.code(400).send({ success: false, error: 'Invalid id' });
      }

      const existing = await db.query.announcements.findFirst({
        where: eq(announcements.id, id),
      });
      if (!existing)
      {
        return reply.code(404).send({ success: false, error: 'Announcement not found' });
      }

      await db.delete(announcements).where(eq(announcements.id, id));

      return reply.send({ success: true });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to delete announcement');
      return reply.code(500).send({ success: false, error: 'Failed to delete announcement' });
    }
  });
}
