import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { setupUserServerRoutes } from './setupRoutes';

// Mock database
vi.mock('../../../src/db/src/db', () => ({
  db: {
    query: {
      events: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      registeredUsers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '../../../src/db/src/db';

describe('Events API - User Server', () => {
  let fastify: any;

  beforeEach(async () => {
    fastify = await setupUserServerRoutes();
  });

  it('should get all events', async () => {
    const mockEvents = [
      { id: 1, name: 'Event 1', startDate: new Date(), endDate: new Date() },
      { id: 2, name: 'Event 2', startDate: new Date(), endDate: new Date() },
    ];

    vi.mocked(db.query.events.findMany).mockResolvedValueOnce(mockEvents as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/events',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('should get single event by ID', async () => {
    const mockEvent = { id: 1, name: 'Event 1', startDate: new Date() };

    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvent as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/events/1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Event 1');
  });

  it('should return 404 when event not found', async () => {
    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/events/999',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should register user for event', async () => {
    const mockEvent = { id: 1, name: 'Event 1' };

    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvent as any);
    vi.mocked(db.query.registeredUsers.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/events/1/register',
      payload: { userEmail: 'test@example.com' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should return 400 when registering without userEmail', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/events/1/register',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 when event not found for registration', async () => {
    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/events/999/register',
      payload: { userEmail: 'test@example.com' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should register user for event with registration details', async () => {
    const mockEvent = { id: 1, name: 'Event 1', cost: 0 };

    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvent as any);
    vi.mocked(db.query.registeredUsers.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/events/1/register',
      payload: {
        userEmail: 'newuser@example.com',
        instance: 0,
        details: { question1: 'answer1' },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.userEmail).toBe('newuser@example.com');
  });

  it('should reject duplicate event registrations', async () => {
    const mockEvent = { id: 1, name: 'Event 1' };
    const mockRegistry = { id: 1, eventId: 1, userEmail: 'test@example.com' };

    vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvent as any);
    vi.mocked(db.query.registeredUsers.findFirst).mockResolvedValueOnce(mockRegistry as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/events/1/register',
      payload: { userEmail: 'test@example.com' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('already registered');
  });

  afterAll(async () => {
    await fastify.close();
  });
});
