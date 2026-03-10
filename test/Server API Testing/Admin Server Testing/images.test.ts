import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

vi.mock('../../../src/db/src/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../../../src/db/src/db';
import imageRoutes from '../../../src/web-admin/src/server/imagesAPI';

describe('Images API', () => {
  let fastify: FastifyInstance;
  const mockImage = {
    id: 1,
    component: 'hero_section',
    index: 0,
    fileName: 'test.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    imageData: Buffer.from('fake image data'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors, { origin: 'http://localhost:3024', credentials: true });
    await fastify.register(cookie);
    await fastify.register(imageRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/images/:component', () => {
    it('should return all images for a component', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([mockImage]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/hero_section',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should handle empty result gracefully', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValueOnce([]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/nonexistent',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(0);
    });
  });

  describe('GET /api/images/:id/view', () => {
    it('should return image file data', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([mockImage]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/1/view',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should return 404 when image not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/999/view',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Image not found');
    });
  });

  describe('DELETE /api/images/:id', () => {
    it('should delete an image', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([mockImage]);
      const mockWhere = vi.fn().mockReturnValueOnce({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValueOnce({ where: mockWhere } as any);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/images/1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Image deleted successfully');
    });

    it('should return 404 when image not found', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([]);
      const mockWhere = vi.fn().mockReturnValueOnce({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValueOnce({ where: mockWhere } as any);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/images/999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Image not found');
    });
  });

  describe('GET /api/images/:component/:index', () => {
    it('should return a specific image by component and index', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([mockImage]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/hero_section/0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.component).toBe('hero_section');
    });

    it('should return 404 when image not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelectChain as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/images/nonexistent/0',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Image not found');
    });
  });
});
