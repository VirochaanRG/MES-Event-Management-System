import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

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
      qrCodes: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

import { db } from '../../../src/db/src/db';
import eventsRoutes from '../../../src/web-admin/src/server/eventsAPI';

describe('Events API', () => {
  let fastify: FastifyInstance;
  const mockEvents = [
    {
      id: 1,
      title: 'Test Event 1',
      description: 'Test Description 1',
      location: 'Test Location 1',
      startTime: new Date('2026-04-01T10:00:00Z'),
      endTime: new Date('2026-04-01T12:00:00Z'),
      capacity: 100,
      isPublic: true,
      status: 'scheduled',
      cost: 0,
      registrationForm: {
        questions: [
          {
            qorder: '1',
            label: 'First Name',
            question_type: 'text_answer',
            options: [],
            required: true,
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: 'Past Event',
      description: 'A past event',
      location: 'Past Location',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T12:00:00Z'),
      capacity: 50,
      isPublic: true,
      status: 'completed',
      cost: 0,
      registrationForm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeAll(async () => {
    fastify = Fastify({ logger: false });

    // Register plugins
    await fastify.register(cors, {
      origin: 'http://localhost:3024',
      credentials: true,
    });

    await fastify.register(cookie);

    // Register the events routes
    await fastify.register(eventsRoutes);

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/events', () => {
    it('should return all events sorted by date', async () => {
      vi.mocked(db.query.events.findMany).mockResolvedValueOnce(mockEvents);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('should sort future events before past events', async () => {
      const futureEvent = { ...mockEvents[0] };
      const pastEvent = { ...mockEvents[1] };

      vi.mocked(db.query.events.findMany).mockResolvedValueOnce([pastEvent, futureEvent]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // The sorted array should have future events first
      expect(body.data[0].id).toBe(1); // Future event
      expect(body.data[1].id).toBe(2); // Past event
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.query.events.findMany).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch events');
    });
  });

  describe('POST /api/event/create', () => {
    it('should create a new event with all required fields', async () => {
      const newEvent = {
        title: 'New Event',
        description: 'New Description',
        location: 'New Location',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T12:00:00Z',
        capacity: 200,
        isPublic: true,
        status: 'scheduled',
        cost: 50,
      };

      const createdEvent = { id: 3, ...newEvent, createdAt: new Date(), updatedAt: new Date() };

      const mockReturning = vi.fn().mockResolvedValueOnce([createdEvent]);
      const mockValues = vi.fn().mockReturnValueOnce({ returning: mockReturning });

      vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/event/create',
        payload: newEvent,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('New Event');
    });

    it('should create an event with default registration form', async () => {
      const newEvent = {
        title: 'Event Without Form',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T12:00:00Z',
      };

      const createdEvent = {
        id: 4,
        ...newEvent,
        description: null,
        location: null,
        capacity: 0,
        isPublic: true,
        status: 'scheduled',
        cost: 0,
        registrationForm: {
          questions: [
            { qorder: '1', label: 'First Name', question_type: 'text_answer', options: [], required: true },
            { qorder: '2', label: 'Last Name', question_type: 'text_answer', options: [], required: true },
            { qorder: '3', label: 'Email', question_type: 'text_answer', options: [], required: true },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValueOnce([createdEvent]);
      const mockValues = vi.fn().mockReturnValueOnce({ returning: mockReturning });

      vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/event/create',
        payload: newEvent,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.registrationForm).toBeDefined();
    });

    it('should return 400 when missing required fields', async () => {
      const incompleteEvent = {
        title: 'Incomplete Event',
        // Missing startTime and endTime
      };

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/event/create',
        payload: incompleteEvent,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing required fields');
    });

    it('should handle creation errors gracefully', async () => {
      const newEvent = {
        title: 'Event',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T12:00:00Z',
      };

      const mockReturning = vi.fn().mockRejectedValueOnce(new Error('Database insert failed'));
      const mockValues = vi.fn().mockReturnValueOnce({ returning: mockReturning });

      vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/event/create',
        payload: newEvent,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Failed to create event');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an existing event', async () => {
      const updates = {
        title: 'Updated Event Title',
        capacity: 250,
      };

      const updatedEvent = { ...mockEvents[0], ...updates, updatedAt: new Date() };

      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updatedEvent]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/events/1',
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Event Title');
      expect(body.data.capacity).toBe(250);
    });

    it('should return 404 when event does not exist', async () => {
      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/events/999',
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });

    it('should convert date strings to Date objects', async () => {
      const updates = {
        startTime: '2026-06-01T15:00:00Z',
        endTime: '2026-06-01T17:00:00Z',
      };

      const mockSetFn = vi.fn().mockReturnThis();
      const mockReturnChain = {
        set: mockSetFn,
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([mockEvents[0]]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      await fastify.inject({
        method: 'PUT',
        url: '/api/events/1',
        payload: updates,
      });

      expect(mockSetFn).toHaveBeenCalled();
      const setCall = mockSetFn.mock.calls[0][0];
      expect(setCall.startTime instanceof Date || typeof setCall.startTime === 'undefined').toBe(true);
    });
  });

  describe('GET /api/events/:id/registration', () => {
    it('should return registration status for a user', async () => {
      const mockRegistration = {
        id: 1,
        eventId: 1,
        userEmail: 'user@example.com',
        status: 'confirmed',
        registrationData: {},
      };

      vi.mocked(db.query.registeredUsers.findFirst).mockResolvedValueOnce(mockRegistration);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration?userEmail=user@example.com',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.isRegistered).toBe(true);
      expect(body.data.status).toBe('confirmed');
    });

    it('should return false when user is not registered', async () => {
      vi.mocked(db.query.registeredUsers.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration?userEmail=notregistered@example.com',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.isRegistered).toBe(false);
    });

    it('should return 400 when userEmail parameter is missing', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('userEmail');
    });
  });

  describe('GET /api/events/:id/registrationlist', () => {
    it('should return list of registered users for an event', async () => {
      const mockRegistrations = [
        {
          id: 1,
          eventId: 1,
          userEmail: 'user1@example.com',
          status: 'confirmed',
        },
        {
          id: 2,
          eventId: 1,
          userEmail: 'user2@example.com',
          status: 'confirmed',
        },
      ];

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRegistrations),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registrationlist',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('should handle empty registration list', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registrationlist',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(0);
    });
  });

  describe('GET /api/events/:id/registration-form', () => {
    it('should return event registration form', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration-form',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.questions)).toBe(true);
      expect(body.questions.length).toBeGreaterThan(0);
    });

    it('should return empty questions array when event has no registration form', async () => {
      const eventWithoutForm = { ...mockEvents[0], registrationForm: null };
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(eventWithoutForm);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration-form',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.questions).toEqual([]);
    });

    it('should return 404 when event does not exist', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/999/registration-form',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });

    it('should transform questions to correct format', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/registration-form',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const question = body.questions[0];
      expect(question.questionTitle).toBeDefined();
      expect(question.questionType).toBeDefined();
      expect(question.required).toBeDefined();
    });
  });

  describe('PUT /api/events/:id/registration-form', () => {
    it('should update event registration form', async () => {
      const newForm = {
        questions: [
          {
            label: 'Full Name',
            question_type: 'text_answer',
            options: [],
            required: true,
          },
        ],
      };

      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const updatedEvent = { ...mockEvents[0], registrationForm: newForm };

      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updatedEvent]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/events/1/registration-form',
        payload: { registrationForm: newForm },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 when registration form is invalid', async () => {
      const invalidForm = { questions: null };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/events/1/registration-form',
        payload: { registrationForm: invalidForm },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid registration form');
    });

    it('should return 404 when event does not exist', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/events/999/registration-form',
        payload: {
          registrationForm: {
            questions: [{ label: 'Test', question_type: 'text_answer', required: true }],
          },
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });
  });

  describe('PATCH /api/events/:id/check-in', () => {
    it('should check in a registered user', async () => {
      const checkedInUser = {
        id: 1,
        eventId: 1,
        userId: 5,
        status: 'attended',
      };

      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([checkedInUser]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/1/check-in',
        payload: { userId: 5 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('attended');
    });

    it('should return 404 when user is not found or already checked in', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/1/check-in',
        payload: { userId: 999 },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already checked in');
    });

    it('should return 404 when event does not exist', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/999/check-in',
        payload: { userId: 5 },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });
  });

  describe('GET /api/events/:id/qr-registration', () => {
    it('should check QR code registration', async () => {
      const qrCode = {
        id: 1,
        content: 'abc123xyz',
      };

      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);
      vi.mocked(db.query.qrCodes.findFirst).mockResolvedValueOnce(qrCode);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/qr-registration?registrationHash=abc123xyz',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.isRegistered).toBe(true);
    });

    it('should return false when QR code is not found', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);
      vi.mocked(db.query.qrCodes.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/qr-registration?registrationHash=invalid',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.isRegistered).toBe(false);
    });

    it('should return 400 when registrationHash is missing', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/1/qr-registration',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('registrationHash');
    });

    it('should return 404 when event does not exist', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/events/999/qr-registration?registrationHash=abc123xyz',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });
  });

  describe('PATCH /api/events/:id/qr-check-in', () => {
    it('should check in user via QR code', async () => {
      const checkedInUser = {
        id: 1,
        eventId: 1,
        status: 'attended',
      };

      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const mockReturnChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([checkedInUser]),
      };

      vi.mocked(db.update).mockReturnValue(mockReturnChain as any);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/1/qr-check-in',
        payload: { registrationHash: 'abc123xyz' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 when registrationHash is missing', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(mockEvents[0]);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/1/qr-check-in',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Registration hash');
    });

    it('should return 404 when event does not exist', async () => {
      vi.mocked(db.query.events.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/events/999/qr-check-in',
        payload: { registrationHash: 'abc123xyz' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Event not found');
    });
  });
});
