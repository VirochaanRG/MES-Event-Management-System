import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { and, eq, inArray } from 'drizzle-orm';
import { announcements, announcementReads, registeredUsers, events } from '../../../db/src/schemas/events';

export default async function userAnnouncementsRoutes(fastify: FastifyInstance)
{
  /**
   * GET /api/user/announcements?email=...
   * Returns all announcements visible to the given user:
   *   - All general announcements (eventId IS NULL)
   *   - Event-specific announcements for events the user is registered to (paid)
   * Each announcement includes a `read` boolean.
   */
  fastify.get<{ Querystring: { email?: string } }>('/api/user/announcements', async (request, reply) =>
  {
    try
    {
      const email = (request.query.email ?? '').toLowerCase().trim();

      // Fetch all announcements
      const allAnnouncements = await db.query.announcements.findMany({
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });

      // Determine which event-specific announcements the user can see
      let registeredEventIds: number[] = [];
      if (email)
      {
        const registrations = await db.query.registeredUsers.findMany({
          where: and(
            eq(registeredUsers.userEmail, email),
            eq(registeredUsers.paymentStatus, 'paid'),
          ),
          columns: { eventId: true },
        });
        registeredEventIds = registrations.map(r => r.eventId);
      }

      // Filter: general (null eventId) OR event-specific user is registered for
      const visible = allAnnouncements.filter(a =>
        a.eventId === null || registeredEventIds.includes(a.eventId),
      );

      if (visible.length === 0)
      {
        return reply.send({ success: true, data: [] });
      }

      // Find which ones the user has already read
      let readIds = new Set<number>();
      if (email)
      {
        const reads = await db.query.announcementReads.findMany({
          where: and(
            eq(announcementReads.userEmail, email),
            inArray(announcementReads.announcementId, visible.map(a => a.id)),
          ),
          columns: { announcementId: true },
        });
        readIds = new Set(reads.map(r => r.announcementId));
      }

      // Enrich with event titles
      const eventIds = visible.map(a => a.eventId).filter((id): id is number => id !== null);
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
        data: visible.map(a => ({
          ...a,
          eventTitle: a.eventId != null ? (eventMap[a.eventId] ?? null) : null,
          read: readIds.has(a.id),
        })),
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch user announcements');
      return reply.code(500).send({ success: false, error: 'Failed to fetch announcements' });
    }
  });

  /**
   * POST /api/user/announcements/read
   * Body: { email: string; announcementIds: number[] }
   * Marks the given announcements as read for the user.
   * Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent.
   */
  fastify.post<{
    Body: { email: string; announcementIds: number[] };
  }>('/api/user/announcements/read', async (request, reply) =>
  {
    try
    {
      const { email, announcementIds } = request.body;

      if (!email?.trim() || !Array.isArray(announcementIds) || announcementIds.length === 0)
      {
        return reply.code(400).send({ success: false, error: 'email and announcementIds are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Insert read records, ignoring duplicates
      await db
        .insert(announcementReads)
        .values(announcementIds.map(id => ({ announcementId: id, userEmail: normalizedEmail })))
        .onConflictDoNothing();

      return reply.send({ success: true });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to mark announcements as read');
      return reply.code(500).send({ success: false, error: 'Failed to mark announcements as read' });
    }
  });
}
