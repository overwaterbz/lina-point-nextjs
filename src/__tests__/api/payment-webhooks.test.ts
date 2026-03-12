/**
 * @jest-environment node
 */

/**
 * Tests for POST /api/stripe/webhook
 * Covers: signature verification, payment_intent.succeeded, charge.refunded, idempotency
 */

// ── mock supabase-server (dynamic import in handler) ──
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockLimit = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(async () => ({
    from: mockFrom,
    auth: { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user: null } }) } },
  })),
}));

// ── mock bookingFulfillment (dynamic import in handler) ──
const mockMarkReservationPaid = jest.fn().mockResolvedValue('LP-ABC123');
jest.mock('@/lib/bookingFulfillment', () => ({
  markReservationPaid: (...args: any[]) => mockMarkReservationPaid(...args),
}));

// ── mock stripe ──
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

// ── mock resend (used in sendBookingConfirmation) ──
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}), { virtual: true });

import { POST } from '@/app/api/stripe/webhook/route';

function makeWebhookRequest(body: string, sig = 'sig_test_valid'): Request {
  return new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': sig,
      'content-type': 'application/json',
    },
    body,
  });
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
  });

  it('should return 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const response = await POST(makeWebhookRequest('{}'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.received).toBe(false);
  });

  it('should return 500 when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const response = await POST(makeWebhookRequest('{}'));
    expect(response.status).toBe(500);
  });

  it('should handle payment_intent.succeeded and mark booking paid', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount: 50000,
          metadata: { booking_id: 'bk_001', processor: 'stripe' },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    // Idempotency check: not already paid
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tour_bookings') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: jest.fn(), update: jest.fn() };
    });

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(mockMarkReservationPaid).toHaveBeenCalledWith(
      expect.anything(),
      'bk_001',
      'pi_test_123',
      'stripe',
    );
  });

  it('should skip already-paid bookings (idempotency)', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_dup',
          amount: 50000,
          metadata: { booking_id: 'bk_dup', processor: 'stripe' },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [{ status: 'paid' }] }),
          }),
        }),
      }),
    }));

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    expect(response.status).toBe(200);
    expect(mockMarkReservationPaid).not.toHaveBeenCalled();
  });

  it('should handle charge.refunded and update reservation', async () => {
    const event = {
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_refund_1',
          payment_intent: 'pi_orig_123',
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const mockUpdateChain = {
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockImplementation(() => ({
      update: jest.fn().mockReturnValue(mockUpdateChain),
    }));

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    expect(response.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('reservations');
  });

  it('should return 200 for unhandled event types', async () => {
    mockConstructEvent.mockReturnValue({ type: 'setup_intent.created', data: { object: {} } });

    const response = await POST(makeWebhookRequest('{}'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });
});
