import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { setupUserServerRoutes } from './setupRoutes';

// Mock database
vi.mock('../../../src/db/src/db', () => ({
  db: {
    query: {
      form: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      modularForms: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      formQuestions: {
        findFirst: vi.fn(),
      },
      formSubmissions: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '../../../src/db/src/db';

describe('Forms API - User Server', () => {
  let fastify: any;

  beforeEach(async () => {
    fastify = await setupUserServerRoutes();
  });

  it('should get all public forms', async () => {
    const mockForms = [
      { id: 1, name: 'Survey 1', isPublic: true },
      { id: 2, name: 'Survey 2', isPublic: true },
    ];

    vi.mocked(db.query.form.findMany).mockResolvedValueOnce(mockForms as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/forms',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('should get available forms for user', async () => {
    const mockForms = [{ id: 1, name: 'Survey 1', isPublic: true }];

    vi.mocked(db.query.form.findMany).mockResolvedValueOnce(mockForms as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/forms/available/user1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should get completed forms for user', async () => {
    const mockForms = [{ id: 2, name: 'Survey 2', isPublic: true }];

    vi.mocked(db.query.form.findMany).mockResolvedValueOnce(mockForms as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/forms/completed/user1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should get single form by ID', async () => {
    const mockForm = { id: 1, name: 'Survey 1', isPublic: true };

    vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(mockForm as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/forms/1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Survey 1');
  });

  it('should return 404 when form not found', async () => {
    vi.mocked(db.query.form.findFirst).mockResolvedValueOnce(null);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/forms/999',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should get single modular form by ID', async () => {
    const mockModForm = { id: 1, name: 'Modular Form 1', isPublic: true };

    vi.mocked(db.query.modularForms.findFirst).mockResolvedValueOnce(mockModForm as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/mod-forms/1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should post form answer for a question', async () => {
    const mockQuestion = { id: 1, formId: 1, label: 'Question 1' };

    vi.mocked(db.query.form.findFirst).mockResolvedValueOnce({ id: 1, isPublic: true } as any);
    vi.mocked(db.query.formQuestions.findFirst).mockResolvedValueOnce(mockQuestion as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/forms/1/answers/user1',
      payload: {
        qid: '1',
        answer: 'test answer',
        questionType: 'text',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should submit completed form', async () => {
    vi.mocked(db.query.form.findFirst).mockResolvedValueOnce({ id: 1, isPublic: true } as any);

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/api/forms/1/submit/user1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe('user1');
  });

  afterAll(async () => {
    await fastify.close();
  });
});
