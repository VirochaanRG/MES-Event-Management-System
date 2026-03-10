import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

vi.mock('../../../src/db/src/db', () => ({
  db: {
    query: {
      form: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      modularForms: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../../../src/db/src/db';
import formsRoutes from '../../../src/web-admin/src/server/formsAPI';

describe('Forms API', () => {
  let fastify: FastifyInstance;
  const mockForm = {
    id: 1,
    name: 'Test Form',
    description: 'Test Description',
    moduleId: null,
    isPublic: true,
    unlockAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockModularForm = {
    id: 1,
    name: 'Modular Form',
    description: 'Modular Description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors, { origin: 'http://localhost:3024', credentials: true });
    await fastify.register(cookie);
    await fastify.register(formsRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/forms', () => {
    it('should return all standard forms', async () => {
      vi.mocked(db.query.form.findMany).mockResolvedValueOnce([mockForm]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/forms/all', () => {
    it('should return all forms including sub-forms', async () => {
      vi.mocked(db.query.form.findMany).mockResolvedValueOnce([mockForm, { ...mockForm, id: 2 }]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms/all',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
    });
  });

  describe('GET /api/mod-forms', () => {
    it('should return all modular forms', async () => {
      vi.mocked(db.query.modularForms.findMany).mockResolvedValueOnce([mockModularForm]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/mod-forms',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/forms/:id', () => {
    it('should return a single form by ID', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(1);
    });

    it('should return 404 when form not found', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms/999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Form not found');
    });
  });

  describe('POST /api/forms', () => {
    it('should create a new standard form', async () => {
      const newForm = { name: 'New Form', description: 'Description' };
      const createdForm = { id: 2, ...newForm, moduleId: null, isPublic: false, unlockAt: null, createdAt: new Date(), updatedAt: new Date() };

      const mockReturning = vi.fn().mockResolvedValueOnce([createdForm]);
      const mockValues = vi.fn().mockReturnValueOnce({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/forms',
        payload: newForm,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 when form name is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/forms',
        payload: { description: 'No name' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('name');
    });
  });

  describe('PUT /api/forms/:id', () => {
    it('should update an existing form', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);

      const updatedForm = { ...mockForm, name: 'Updated Form' };
      const mockReturning = vi.fn().mockResolvedValueOnce([updatedForm]);
      const mockSet = vi.fn().mockReturnValueOnce({ where: vi.fn().mockReturnValueOnce({ returning: mockReturning }) });
      vi.mocked(db.update).mockReturnValueOnce({ set: mockSet } as any);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/forms/1',
        payload: { name: 'Updated Form' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 when form not found', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/forms/999',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Form not found');
    });
  });
});
