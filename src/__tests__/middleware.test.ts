/**
 * @jest-environment node
 */

/**
 * Tests for middleware.ts
 * Covers: public routes, protected routes, self-auth API routes, security headers
 */

import { NextRequest } from 'next/server';

// Track the mock getUser return value
let mockUser: any = null;

// Mock @supabase/ssr before importing middleware
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockUser }, error: null })
      ),
    },
  })),
}));

import { middleware } from '../../middleware';

function createRequest(path: string, method = 'GET'): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), { method });
}

describe('middleware', () => {
  beforeEach(() => {
    mockUser = null;
    jest.clearAllMocks();
  });

  describe('public routes', () => {
    const publicRoutes = ['/', '/rooms', '/experiences', '/concierge', '/gallery', '/terms', '/privacy', '/auth/login', '/auth/signup'];

    it.each(publicRoutes)('should allow %s without auth', async (route) => {
      const response = await middleware(createRequest(route));
      // Should NOT redirect (status 200 or 307 -> only for protected)
      expect(response.status).not.toBe(307);
    });

    it('should include security headers on public routes', async () => {
      const response = await middleware(createRequest('/'));
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
      expect(response.headers.get('x-request-id')).toBeTruthy();
    });
  });

  describe('SEO routes', () => {
    it.each(['/sitemap.xml', '/robots.txt', '/favicon.ico', '/favicon.svg'])(
      'should pass %s through without processing',
      async (route) => {
        const response = await middleware(createRequest(route));
        expect(response.status).not.toBe(307);
      },
    );
  });

  describe('self-auth API routes', () => {
    const selfAuthRoutes = [
      '/api/cron/run-daily-marketing',
      '/api/cron/health-check',
      '/api/availability',
      '/api/whatsapp-webhook',
      '/api/stripe/webhook',
      '/api/square/webhook',
      '/api/system/status',
    ];

    it.each(selfAuthRoutes)('should pass %s through without session check', async (route) => {
      const response = await middleware(createRequest(route));
      expect(response.status).not.toBe(307);
      expect(response.headers.get('x-request-id')).toBeTruthy();
    });
  });

  describe('protected routes', () => {
    it('should redirect to /auth/login when not authenticated', async () => {
      mockUser = null;
      const response = await middleware(createRequest('/dashboard'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/login');
      expect(response.headers.get('location')).toContain('returnTo=%2Fdashboard');
    });

    it('should redirect admin routes when not authenticated', async () => {
      mockUser = null;
      const response = await middleware(createRequest('/admin/dashboard'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/login');
    });

    it('should allow authenticated user to access protected routes', async () => {
      mockUser = { id: 'user-123', email: 'test@example.com' };
      const response = await middleware(createRequest('/dashboard'));
      expect(response.status).not.toBe(307);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should allow authenticated user to access booking page', async () => {
      mockUser = { id: 'user-123', email: 'test@example.com' };
      const response = await middleware(createRequest('/booking'));
      expect(response.status).not.toBe(307);
    });
  });

  describe('security headers', () => {
    it('should set x-request-id as UUID', async () => {
      const response = await middleware(createRequest('/'));
      const requestId = response.headers.get('x-request-id');
      expect(requestId).toBeTruthy();
      // UUID v4 format check
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should set all required security headers on authenticated routes', async () => {
      mockUser = { id: 'user-123', email: 'test@example.com' };
      const response = await middleware(createRequest('/dashboard'));
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    });
  });
});
