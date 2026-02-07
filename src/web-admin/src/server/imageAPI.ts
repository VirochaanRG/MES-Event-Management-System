import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { db } from '../../../db/src/db';
import { images } from '../../../db/src/schemas/images';
import { eq } from 'drizzle-orm';

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

  // Upload image
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

      const result = await db
        .insert(images)
        .values({
          imageData: buffer,
          component: component,
          index: indexStr ? parseInt(indexStr) : null,
          fileName: data.filename,
          mimeType: data.mimetype,
          fileSize: buffer.length,
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: {
          id: result[0].id,
          fileName: result[0].fileName,
          component: result[0].component,
          index: result[0].index,
        },
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
          .where(eq(images.component, component))
          .where(eq(images.index, parseInt(index)))
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
}