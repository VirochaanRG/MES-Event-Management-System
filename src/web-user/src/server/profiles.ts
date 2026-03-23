import { FastifyInstance } from 'fastify';
import { db } from '../../../db/src/db';
import { profiles, users } from '../../../db/src/schemas/users';
import { eq } from 'drizzle-orm';

interface ProfilePayload
{
  userId?: number;
  email?: string;
  firstName: string;
  lastName: string;
  isMcmasterStudent: boolean;
  faculty?: string | null;
  program?: string | null;
}

async function resolveUser(userId?: number, email?: string)
{
  if (userId && Number.isFinite(userId))
  {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  if (email && email.trim())
  {
    return db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
  }

  return null;
}

export default async function profileRoutes(fastify: FastifyInstance)
{
  // Get profile by user id
  fastify.get<{ Params: { userId: string } }>('/api/profiles/:userId', async (request, reply) =>
  {
    try
    {
      const userIdNum = parseInt(request.params.userId);
      if (Number.isNaN(userIdNum))
      {
        return reply.code(400).send({ success: false, error: 'Invalid user id' });
      }

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userIdNum),
      });

      return reply.send({
        success: true,
        data: profile ?? null,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch profile by user id');
      return reply.code(500).send({ success: false, error: 'Failed to fetch profile' });
    }
  });

  // Get profile by user lookup (userId or email)
  fastify.get<{ Querystring: { userId?: string; email?: string } }>('/api/profiles', async (request, reply) =>
  {
    try
    {
      const userId = request.query.userId ? parseInt(request.query.userId) : undefined;
      const user = await resolveUser(userId, request.query.email);

      if (!user)
      {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user.id),
      });

      return reply.send({
        success: true,
        data: profile ?? null,
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to fetch profile');
      return reply.code(500).send({ success: false, error: 'Failed to fetch profile' });
    }
  });

  // Create or update profile
  fastify.post<{ Body: ProfilePayload }>('/api/profiles', async (request, reply) =>
  {
    try
    {
      const {
        userId,
        email,
        firstName,
        lastName,
        isMcmasterStudent,
        faculty,
        program,
      } = request.body;

      if (!firstName?.trim() || !lastName?.trim())
      {
        return reply.code(400).send({
          success: false,
          error: 'First name and last name are required',
        });
      }

      const user = await resolveUser(userId, email);
      if (!user)
      {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      const existing = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user.id),
      });

      const normalizedFaculty = faculty?.trim() || null;
      const normalizedProgram = program?.trim() || null;

      if (existing)
      {
        const [updated] = await db
          .update(profiles)
          .set({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            isMcmasterStudent,
            faculty: normalizedFaculty,
            program: normalizedProgram,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, user.id))
          .returning();

        return reply.send({
          success: true,
          data: updated,
          message: 'Profile updated successfully',
        });
      }

      const [created] = await db
        .insert(profiles)
        .values({
          userId: user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isMcmasterStudent,
          faculty: normalizedFaculty,
          program: normalizedProgram,
        })
        .returning();

      return reply.code(201).send({
        success: true,
        data: created,
        message: 'Profile created successfully',
      });
    } catch (error)
    {
      fastify.log.error({ err: error }, 'Failed to save profile');
      return reply.code(500).send({ success: false, error: 'Failed to save profile' });
    }
  });
}
