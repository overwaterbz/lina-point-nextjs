/**
 * @jest-environment node
 */

/**
 * Tests for /api/gen-magic-content endpoint
 * Tests AI-powered magic content generation (songs, videos)
 */

// ── Supabase mock setup (module-level, mimics route's top-level createClient) ──
const mockGetUser = jest.fn();
const mockSbFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockSbFrom,
  })),
}));

const mockGenerateMagicContent = jest.fn();
jest.mock('@/lib/magicContent', () => ({
  generateMagicContent: (...args: any[]) => mockGenerateMagicContent(...args),
}));

jest.mock('@/lib/agents/agentRunLogger', () => ({
  createAgentRun: jest.fn(async () => 'run-id-mock'),
  finishAgentRun: jest.fn(async () => {}),
}));

import { POST } from '@/app/api/gen-magic-content/route';
import { NextRequest } from 'next/server';

function makeMagicRequest(body: Record<string, unknown>, authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authHeader) headers['authorization'] = authHeader;
  return new NextRequest(new URL('http://localhost:3000/api/gen-magic-content'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** Set up all Supabase mocks so the route's full auth → booking → profile → generate chain works */
function setupHappyPath() {
  // auth.getUser returns a valid user
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });

  // from() chains: tour_bookings → select/eq/single, profiles → select/eq/single
  mockSbFrom.mockImplementation((table: string) => {
    if (table === 'tour_bookings') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'res-123', user_id: 'user-1', add_ons: ['magic'] }, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { user_id: 'user-1', opt_in_magic: true }, error: null }),
          }),
        }),
      };
    }
    return { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
  });

  // generateMagicContent success
  mockGenerateMagicContent.mockResolvedValue({
    items: [
      { contentType: 'song', mediaUrl: 'https://cdn.example.com/song.mp3' },
      { contentType: 'video', mediaUrl: 'https://cdn.example.com/video.mp4' },
    ],
  });
}

describe('POST /api/gen-magic-content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPath();
  });

  describe('Magic Generation', () => {
    it('should generate magic content with valid input', async () => {
      const response = await POST(makeMagicRequest({
        reservationId: 'res-123',
        occasion: 'anniversary',
        musicStyle: 'jazz',
        mood: 'romantic',
        recipientName: 'Sarah',
        giftYouName: 'John',
        message: 'Happy anniversary!',
      }, 'Bearer test-token'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(2);
    });

    it('should support different occasions', async () => {
      for (const occasion of ['birthday', 'anniversary', 'proposal']) {
        const response = await POST(makeMagicRequest({
          reservationId: 'res-123',
          occasion,
          musicStyle: 'pop',
          recipientName: 'User',
          giftYouName: 'Guest',
        }, 'Bearer test-token'));
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Content Types', () => {
    it('should return song and video items', async () => {
      const response = await POST(makeMagicRequest({
        reservationId: 'res-123',
        occasion: 'birthday',
        musicStyle: 'pop',
        recipientName: 'Alex',
        giftYouName: 'Friend',
      }, 'Bearer test-token'));

      const data = await response.json();
      const types = data.items.map((i: any) => i.contentType);
      expect(types).toContain('song');
      expect(types).toContain('video');
    });

    it('should include media URLs', async () => {
      const response = await POST(makeMagicRequest({
        reservationId: 'res-123',
        occasion: 'anniversary',
        musicStyle: 'romantic',
        recipientName: 'Partner',
        giftYouName: 'You',
      }, 'Bearer test-token'));

      const data = await response.json();
      data.items.forEach((item: any) => {
        expect(item.mediaUrl).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject missing auth header (401)', async () => {
      const response = await POST(makeMagicRequest({ reservationId: 'res-123', occasion: 'birthday' }));
      expect(response.status).toBe(401);
    });

    it('should reject invalid token (401)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } });
      const response = await POST(makeMagicRequest({ reservationId: 'res-123', occasion: 'birthday' }, 'Bearer bad'));
      expect(response.status).toBe(401);
    });

    it('should reject missing reservationId (400)', async () => {
      const response = await POST(makeMagicRequest({ occasion: 'birthday' }, 'Bearer test-token'));
      expect(response.status).toBe(400);
    });

    it('should reject missing occasion (400)', async () => {
      const response = await POST(makeMagicRequest({ reservationId: 'res-123' }, 'Bearer test-token'));
      expect(response.status).toBe(400);
    });

    it('should 404 when reservation not found', async () => {
      mockSbFrom.mockImplementation((table: string) => {
        if (table === 'tour_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const response = await POST(makeMagicRequest({ reservationId: 'res-bad', occasion: 'birthday' }, 'Bearer test-token'));
      expect(response.status).toBe(404);
    });

    it('should 500 when generation fails', async () => {
      mockGenerateMagicContent.mockRejectedValue(new Error('AI down'));

      const response = await POST(makeMagicRequest({
        reservationId: 'res-123',
        occasion: 'birthday',
        recipientName: 'User',
        giftYouName: 'Guest',
      }, 'Bearer test-token'));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
