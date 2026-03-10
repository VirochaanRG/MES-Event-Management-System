import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { setupUserServerRoutes } from './setupRoutes';

// Mock database
vi.mock('../../../src/db/src/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '../../../src/db/src/db';

describe('Authentication API - User Server', () => {
  let fastify: any;

  beforeEach(async () => {
    fastify = await setupUserServerRoutes();
  });

  it('should register a new user with valid credentials', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'testuser@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('testuser@example.com');
  });

  it('should return 400 when registering without email or password', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@test.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for password less than 8 characters', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@test.com',
        password: 'short',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 401 on login with invalid credentials', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'nonexistent@test.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should logout successfully', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  afterAll(async () => {
    await fastify.close();
  });
});
