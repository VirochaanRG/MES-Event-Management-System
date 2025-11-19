import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import { db } from '../../../db/src/db';
import { events } from '../../../db/src/schemas/events';
import { form } from './../../../db/src/schemas/form';
import { eq } from 'drizzle-orm';
const fastify = Fastify({ logger: true });
const PORT = 3124;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register plugins
await fastify.register(cors, {
  origin: 'http://localhost:3024',
  credentials: true,
});

await fastify.register(cookie);

// Simple health check
fastify.get('/api/health', async (request, reply) =>
{
  reply.send({ status: 'ok' });
});

//Get events
fastify.get('/api/events', async (request, reply) =>
{
  try
  {
    const allEvents = await db.query.events.findMany();

    return reply.send({
      success: true,
      data: allEvents,
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to fetch events');
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// GET all forms
fastify.get('/api/forms', async (request, reply) =>
{
  try
  {
    const forms = await db.query.form.findMany();
    return reply.send({
      success: true,
      data: forms,
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
fastify.get<{ Params: { id: string } }>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const formData = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!formData)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    return reply.send({
      success: true,
      data: formData,
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

// CREATE a new form
fastify.post<{
  Body: { name: string; description?: string };
}>('/api/forms', async (request, reply) =>
{
  try
  {
    const { name, description } = request.body;

    // Validate required fields
    if (!name || name.trim() === '')
    {
      return reply.code(400).send({
        success: false,
        error: 'Form name is required',
      });
    }

    const newForm = await db
      .insert(form)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    return reply.code(201).send({
      success: true,
      data: newForm[0],
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to create form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to create form',
    });
  }
});

// UPDATE a form
fastify.put<{
  Params: { id: string };
  Body: { name?: string; description?: string };
}>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;
    const { name, description } = request.body;

    // Check if form exists
    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (name !== undefined)
    {
      updateData.name = name.trim();
    }
    if (description !== undefined)
    {
      updateData.description = description.trim() || null;
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0)
    {
      return reply.code(400).send({
        success: false,
        error: 'No fields to update',
      });
    }

    const updatedForm = await db
      .update(form)
      .set(updateData)
      .where(eq(form.id, parseInt(id)))
      .returning();

    return reply.send({
      success: true,
      data: updatedForm[0],
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to update form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to update form',
    });
  }
});

// DELETE a form
fastify.delete<{ Params: { id: string } }>('/api/forms/:id', async (request, reply) =>
{
  try
  {
    const { id } = request.params;

    const existingForm = await db.query.form.findFirst({
      where: eq(form.id, parseInt(id)),
    });

    if (!existingForm)
    {
      return reply.code(404).send({
        success: false,
        error: 'Form not found',
      });
    }

    await db.delete(form).where(eq(form.id, parseInt(id)));

    return reply.send({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Failed to delete form');
    return reply.code(500).send({
      success: false,
      error: 'Failed to delete form',
    });
  }
});

//Create events
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
    } = request.body as {
      title: string;
      description?: string;
      location?: string;
      startTime: string;
      endTime: string;
      capacity?: number;
      isPublic?: boolean;
      status?: string;
    };

    // Validate required fields
    if (!title || !startTime || !endTime)
    {
      return reply.status(400).send({
        error: 'Missing required fields: title, startTime, endTime',
      });
    }

    // Create the event in the database
    const newEvent = await db.insert(events).values({
      title,
      description: description || null,
      location: location || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity: capacity || 0,
      isPublic: isPublic !== undefined ? isPublic : true,
      status: status || 'scheduled',
    }).returning();

    return reply.status(201).send({
      success: true,
      data: newEvent[0],
    });
  } catch (error)
  {
    console.error('Error creating event:', error);
    return reply.status(500).send({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Local login (for testing without main portal)
fastify.post('/api/auth/local-login', async (request, reply) =>
{
  try
  {
    const { email } = request.body as { email: string };

    if (!email)
    {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const user = { id: 1, email };
    const localSecret = 'teamd-local-secret';
    const token = jwt.sign({ user }, localSecret, { expiresIn: '24h' });

    reply.send({
      success: true,
      user,
      token
    });
  } catch (error)
  {
    fastify.log.error({ err: error }, 'Local login error');
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Start server
try
{
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Team D Admin server running on http://localhost:${PORT}`);
} catch (err)
{
  fastify.log.error(err);
  process.exit(1);
}
