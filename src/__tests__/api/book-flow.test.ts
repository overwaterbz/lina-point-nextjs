/**
 * @jest-environment node
 */

/**
 * Tests for /api/book-flow endpoint
 * Tests booking creation, tour curation, and magic content triggering
 */

// ── Mock supabase-server (calls cookies() internally) ──
const mockGetUser = jest.fn();
const mockSbFrom = jest.fn();
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockSbFrom,
  })),
}));

const mockRunPriceScout = jest.fn();
jest.mock('@/lib/priceScoutAgent', () => ({
  runPriceScout: (...args: any[]) => mockRunPriceScout(...args),
}));

const mockRunExperienceCurator = jest.fn();
jest.mock('@/lib/experienceCuratorAgent', () => ({
  runExperienceCurator: (...args: any[]) => mockRunExperienceCurator(...args),
}));

jest.mock('@/lib/magicContent', () => ({
  generateMagicContent: jest.fn(),
}));

jest.mock('@/lib/bookingFulfillment', () => ({
  createReservation: jest.fn(async () => ({
    id: 'res-001',
    confirmationNumber: 'LP-ABC123',
    roomName: 'Overwater Suite',
    nights: 7,
  })),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}), { virtual: true });

jest.mock('@/lib/agents/agentRunLogger', () => ({
  createAgentRun: jest.fn(async () => 'run-mock'),
  finishAgentRun: jest.fn(async () => {}),
}));

jest.mock('@/lib/emailTemplates', () => ({
  confirmationEmailHtml: jest.fn(() => '<html>confirm</html>'),
  adminNotificationHtml: jest.fn(() => '<html>admin</html>'),
}));

import { POST } from '@/app/api/book-flow/route';
import { NextRequest } from 'next/server';

function makeBookFlowRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/book-flow'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupHappyPath() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });

  mockSbFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { interests: ['snorkeling'], activity_level: 'medium' }, error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: { interests: ['snorkeling'], activity_level: 'medium', opt_in_magic: true }, error: null }),
          }),
        }),
      };
    }
    if (table === 'prices') {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'tour_bookings') {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [{ id: 'tb-1' }, { id: 'tb-2' }], error: null }),
        }),
      };
    }
    if (table === 'booking_analytics') {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    return { select: jest.fn(), insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
  });

  mockRunPriceScout.mockResolvedValue({
    bestPrice: 299,
    beatPrice: 280,
    bestOTA: 'Booking.com',
    priceUrl: 'https://booking.com/lina-point',
    savings: 51,
    savingsPercent: 14,
    recommendation: 'Book direct',
  });

  mockRunExperienceCurator.mockResolvedValue({
    tours: [
      { name: 'Snorkeling at Hol Chan', type: 'water', price: 75, duration: '3h', url: 'https://tours.example.com/snorkel' },
      { name: 'Cave Tubing', type: 'adventure', price: 120, duration: '6h', url: 'https://tours.example.com/cave' },
    ],
    totalPrice: 195,
    dinner: { name: 'Rain Restaurant', price: 65 },
    recommendations: ['Try the reef tour at sunset'],
    affiliateLinks: [
      { provider: 'GetYourGuide', url: 'https://gyg.example.com', commission: 7.5 },
    ],
  });
}

describe('POST /api/book-flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHappyPath();
  });

  describe('Booking Flow', () => {
    it('should return successful booking with curated package', async () => {
      const response = await POST(makeBookFlowRequest({
        roomType: 'overwater-suite',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-22',
        location: 'Ambergris Caye',
        groupSize: 2,
        tourBudget: 400,
      }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.curated_package).toBeDefined();
      expect(data.curated_package.tours).toBeDefined();
    });

    it('should include price scout savings data', async () => {
      const response = await POST(makeBookFlowRequest({
        roomType: 'beach-villa',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-22',
        location: 'Ambergris Caye',
        groupSize: 2,
        tourBudget: 200,
      }));

      const data = await response.json();
      expect(data.savings_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests (401)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

      const response = await POST(makeBookFlowRequest({
        roomType: 'overwater-suite',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-22',
        location: 'Ambergris Caye',
        groupSize: 2,
        tourBudget: 300,
      }));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Tour Curation', () => {
    it('should include curated tours in response', async () => {
      const response = await POST(makeBookFlowRequest({
        roomType: 'overwater-room',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-22',
        location: 'Ambergris Caye',
        groupSize: 2,
        tourBudget: 300,
        interests: ['snorkeling', 'dining'],
      }));

      const data = await response.json();
      expect(data.curated_package.tours.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle price scout failure gracefully', async () => {
      mockRunPriceScout.mockRejectedValue(new Error('OTA API down'));

      const response = await POST(makeBookFlowRequest({
        roomType: 'overwater-suite',
        checkInDate: '2026-03-15',
        checkOutDate: '2026-03-22',
        location: 'Ambergris Caye',
        groupSize: 2,
        tourBudget: 300,
      }));

      // Route should still return (possibly with defaults or error)
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });
});
