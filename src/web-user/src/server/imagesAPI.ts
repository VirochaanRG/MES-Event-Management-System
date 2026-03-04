import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { images } from '../../../db/src/schemas/images';
import { and, eq } from 'drizzle-orm';

// Type definitions
interface ComponentParams
{
  component: string;
}

interface IdParams
{
  id: string;
}

export default async function publicImageRoutes(fastify: FastifyInstance)
{
  // Get event image
  fastify.get<{ Params: { eventId: string } }>(
    '/api/images/event/:eventId',
    async (request, reply) =>
    {
      try
      {
        const { eventId } = request.params;
        const eventIdNum = parseInt(eventId);

        if (isNaN(eventIdNum))
        {
          return reply.code(400).send({ success: false, error: 'Invalid event ID' });
        }

        const result = await db
          .select()
          .from(images)
          .where(and(eq(images.component, 'event'), eq(images.index, eventIdNum)))
          .limit(1);

        if (result.length === 0)
        {
          return reply.code(404).send({ success: false, error: 'Image not found' });
        }

        const image = result[0];

        return reply
          .header('Content-Type', image.mimeType || 'image/jpeg')
          .header('Cache-Control', 'public, max-age=3600')
          .send(image.imageData);
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error fetching image');
        return reply.code(500).send({ success: false, error: 'Failed to fetch image' });
      }
    }
  );

  // Get all images for a specific component (public route)
  fastify.get<{ Params: ComponentParams }>(
    '/api/public/images/:component',
    async (request, reply) =>
    {
      try
      {
        const { component } = request.params;

        const result = await db
          .select({
            id: images.id,
            fileName: images.fileName,
            mimeType: images.mimeType,
            createdAt: images.createdAt,
          })
          .from(images)
          .where(eq(images.component, component));

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error fetching public images');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch images',
        });
      }
    }
  );

  // View a specific image (public route - returns the actual image file)
  fastify.get<{ Params: IdParams }>(
    '/api/public/images/:id/view',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;

        const result = await db
          .select()
          .from(images)
          .where(eq(images.id, parseInt(id)))
          .limit(1);

        if (result.length === 0)
        {
          return reply.code(404).send({
            success: false,
            error: 'Image not found',
          });
        }

        const image = result[0];

        // Set appropriate headers for browser caching
        reply.header('Content-Type', image.mimeType || 'application/octet-stream');
        reply.header(
          'Content-Disposition',
          `inline; filename="${image.fileName || `image-${id}`}"`
        );
        reply.header('Content-Length', image.imageData.length);
        reply.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Send the image buffer
        return reply.send(image.imageData);
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error viewing public image');
        return reply.code(500).send({
          success: false,
          error: 'Failed to view image',
        });
      }
    }
  );
}