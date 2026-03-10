import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

vi.mock('../../../src/db/src/db', () => ({
  db: {
    query: {
      form: {
        findFirst: vi.fn(),
      },
      formQuestions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../../../src/db/src/db';
import formBuilderRoutes from '../../../src/web-admin/src/server/formBuilderAPI';

describe('Form Builder API', () => {
  let fastify: FastifyInstance;
  const mockForm = {
    id: 1,
    name: 'Test Form',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestion = {
    id: 1,
    formId: 1,
    questionType: 'text_answer',
    questionTitle: 'Test Question',
    optionsCategory: null,
    qorder: 1,
    parentQuestionId: null,
    enablingAnswers: [],
    required: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors, { origin: 'http://localhost:3024', credentials: true });
    await fastify.register(cookie);
    await fastify.register(formBuilderRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/forms/:id/questions', () => {
    it('should create a new form question', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);

      const newQuestion = { questionType: 'text_answer', questionTitle: 'New Question', qorder: 2, required: true };
      const createdQuestion = { id: 2, formId: 1, ...newQuestion, optionsCategory: null, parentQuestionId: null, enablingAnswers: [], createdAt: new Date(), updatedAt: new Date() };

      const mockReturning = vi.fn().mockResolvedValueOnce([createdQuestion]);
      const mockValues = vi.fn().mockReturnValueOnce({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/forms/1/questions',
        payload: newQuestion,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.formId).toBe(1);
    });

    it('should return 400 when questionType is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/forms/1/questions',
        payload: { questionTitle: 'Question', qorder: 1, required: true },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Question type');
    });
  });

  describe('GET /api/forms/:id/questions', () => {
    it('should return all questions for a form', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);
      vi.mocked(db.query.formQuestions.findMany).mockResolvedValueOnce([mockQuestion]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms/1/questions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 404 when form not found', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/forms/999/questions',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Form not found');
    });
  });

  describe('PUT /api/forms/:formId/questions/:questionId', () => {
    it('should update a form question', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);
      vi.mocked(db.query.formQuestions.findFirst).mockResolvedValueOnce(mockQuestion);

      const updates = { questionTitle: 'Updated Question' };
      const updatedQuestion = { ...mockQuestion, ...updates };

      const mockReturning = vi.fn().mockResolvedValueOnce([updatedQuestion]);
      const mockSet = vi.fn().mockReturnValueOnce({ where: vi.fn().mockReturnValueOnce({ returning: mockReturning }) });
      vi.mocked(db.update).mockReturnValueOnce({ set: mockSet } as any);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/forms/1/questions/1',
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /api/forms/:formId/questions/:questionId', () => {
    it('should delete a form question', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);
      vi.mocked(db.query.formQuestions.findFirst).mockResolvedValueOnce(mockQuestion);

      const mockReturning = vi.fn().mockResolvedValueOnce([mockQuestion]);
      const mockWhere = vi.fn().mockReturnValueOnce({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValueOnce({ where: mockWhere } as any);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/forms/1/questions/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 when question not found', async () => {
      vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm);
      vi.mocked(db.query.formQuestions.findFirst).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/forms/1/questions/999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Question not found');
    });
  });
});
