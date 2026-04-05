import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { eq } from 'drizzle-orm';
import { announcements, events } from '../../../db/src/schemas/events';

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
