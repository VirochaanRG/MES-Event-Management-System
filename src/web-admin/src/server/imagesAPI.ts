import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { db } from '../../../db/src/db';
import { images } from '../../../db/src/schemas/images';
import { and, eq } from 'drizzle-orm';

// Type definitions for route parameters and body
interface UploadBody
{
  component: string;
  index?: string;
}

interface ComponentParams
{
  component: string;
}

interface IdParams
{
  id: string;
}

interface ComponentIndexParams
{
  component: string;
  index: string;
}

export default async function imageRoutes(fastify: FastifyInstance)
{
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // Upload image (or replace if exists)
  fastify.post('/api/images/upload', async (request: FastifyRequest, reply: FastifyReply) =>
  {
    try
    {
      const data = await request.file();

      if (!data)
      {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Validate file type
      if (!data.mimetype.startsWith('image/'))
      {
        return reply.code(400).send({
          success: false,
          error: 'Only image files are allowed',
        });
      }

      // Get the file buffer
      const buffer = await data.toBuffer();

      // Get component and index from fields
      const fields = data.fields as any;
      const component = fields.component?.value as string;
      const indexStr = fields.index?.value as string;

      if (!component)
      {
        return reply.code(400).send({
          success: false,
          error: 'Component is required',
        });
      }

      const indexValue = indexStr ? parseInt(indexStr) : null;

      // Check if an image already exists for this component and index
      const existingImage = await db
        .select()
        .from(images)
        .where(
          indexValue !== null
            ? and(
              eq(images.component, component),
              eq(images.index, indexValue)
            )
            : eq(images.component, component)
        )
        .limit(1);

      let result;

      if (existingImage.length > 0)
      {
        // Update existing image
        result = await db
          .update(images)
          .set({
            imageData: buffer,
            fileName: data.filename,
            mimeType: data.mimetype,
            fileSize: buffer.length,
            updatedAt: new Date(),
          })
          .where(eq(images.id, existingImage[0].id))
          .returning();

        fastify.log.info(`Updated existing image for component: ${component}, index: ${indexValue}`);
      }
      else
      {
        // Insert new image
        result = await db
          .insert(images)
          .values({
            imageData: buffer,
            component: component,
            index: indexValue,
            fileName: data.filename,
            mimeType: data.mimetype,
            fileSize: buffer.length,
          })
          .returning();

        fastify.log.info(`Created new image for component: ${component}, index: ${indexValue}`);
      }

      return reply.code(existingImage.length > 0 ? 200 : 201).send({
        success: true,
        data: {
          id: result[0].id,
          fileName: result[0].fileName,
          component: result[0].component,
          index: result[0].index,
        },
        message: existingImage.length > 0 ? 'Image updated successfully' : 'Image created successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Error uploading image');
      return reply.code(500).send({
        success: false,
        error: 'Failed to upload image',
      });
    }
  });

  // Get all images for a specific component
  fastify.get<{ Params: ComponentParams }>(
    '/api/images/:component',
    async (request, reply) =>
    {
      try
      {
        const { component } = request.params;

        const result = await db
          .select({
            id: images.id,
            component: images.component,
            index: images.index,
            fileName: images.fileName,
            mimeType: images.mimeType,
            fileSize: images.fileSize,
            createdAt: images.createdAt,
            updatedAt: images.updatedAt,
          })
          .from(images)
          .where(eq(images.component, component))
          .orderBy(images.index);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error fetching images');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch images',
        });
      }
    }
  );

  // View a specific image (returns the actual image file)
  fastify.get<{ Params: IdParams }>(
    '/api/images/:id/view',
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

        // Set appropriate headers
        reply.header('Content-Type', image.mimeType || 'application/octet-stream');
        reply.header(
          'Content-Disposition',
          `inline; filename="${image.fileName || `image-${id}`}"`
        );
        reply.header('Content-Length', image.imageData.length);

        // Send the image buffer
        return reply.send(image.imageData);
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error viewing image');
        return reply.code(500).send({
          success: false,
          error: 'Failed to view image',
        });
      }
    }
  );

  // Delete an image
  fastify.delete<{ Params: IdParams }>(
    '/api/images/:id',
    async (request, reply) =>
    {
      try
      {
        const { id } = request.params;

        const result = await db
          .delete(images)
          .where(eq(images.id, parseInt(id)))
          .returning();

        if (result.length === 0)
        {
          return reply.code(404).send({
            success: false,
            error: 'Image not found',
          });
        }

        return reply.send({
          success: true,
          message: 'Image deleted successfully',
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error deleting image');
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete image',
        });
      }
    }
  );

  // Get a specific image by component and index
  fastify.get<{ Params: ComponentIndexParams }>(
    '/api/images/:component/:index',
    async (request, reply) =>
    {
      try
      {
        const { component, index } = request.params;

        const result = await db
          .select()
          .from(images)
          .where(
            and(
              eq(images.component, component),
              eq(images.index, parseInt(index))
            )
          )
          .limit(1);

        if (result.length === 0)
        {
          return reply.code(404).send({
            success: false,
            error: 'Image not found',
          });
        }

        return reply.send({
          success: true,
          data: result[0],
        });
      } catch (error)
      {
        fastify.log.error({ err: error }, 'Error fetching image');
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch image',
        });
      }
    }
  );

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
}