/**
 * Tests for src/lib/bookingFulfillment.ts
 * Covers: reservation creation, promo codes, payment marking, cancellation
 */

import { createReservation, markReservationPaid, cancelReservation } from '@/lib/bookingFulfillment';

// Mock inventory module
jest.mock('@/lib/inventory', () => ({
  resolveRoomType: jest.fn((input: string) => {
    const map: Record<string, string> = {
      'overwater cabana': 'cabana_1br',
      'cabana_1br': 'cabana_1br',
      '1st floor suite': 'suite_1st_floor',
      'suite_1st_floor': 'suite_1st_floor',
    };
    return map[input.toLowerCase().trim()] || 'suite_1st_floor';
  }),
  getRoomTypeInfo: jest.fn((rt: string) => {
    const info: Record<string, any> = {
      cabana_1br: { label: '1BR Overwater Cabana', total: 7, baseRate: 199 },
      suite_1st_floor: { label: '1st Floor Hotel Suite', total: 4, baseRate: 299 },
    };
    return info[rt] || info['suite_1st_floor'];
  }),
  findAvailableRoom: jest.fn(),
  markDatesBooked: jest.fn(),
  releaseDates: jest.fn(),
}));

const { findAvailableRoom, markDatesBooked, releaseDates } = require('@/lib/inventory');

// Helper to build a fluent mock Supabase client
function createTestSupabase(overrides: Record<string, any> = {}) {
  const chainResult = {
    data: null as any,
    error: null as any,
  };

  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(chainResult),
    maybeSingle: jest.fn().mockResolvedValue(chainResult),
  };

  const fromMock = jest.fn().mockReturnValue(chain);

  return {
    from: fromMock,
    auth: { getUser: jest.fn(), getSession: jest.fn() },
    _chain: chain,
    _chainResult: chainResult,
    // helper to configure specific table responses
    mockTable(table: string, method: string, result: { data: any; error: any }) {
      fromMock.mockImplementation((t: string) => {
        if (t === table) {
          const tableChain = { ...chain };
          tableChain[method] = jest.fn().mockResolvedValue(result);
          return tableChain;
        }
        return chain;
      });
    },
    ...overrides,
  };
}

describe('bookingFulfillment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    const baseInput = {
      guestId: 'guest-uuid-1',
      roomTypeInput: 'overwater cabana',
      checkIn: '2026-04-01',
      checkOut: '2026-04-04',
      guestsCount: 2,
      totalAmount: 597, // 199 * 3 nights
      bookingId: 'booking-uuid-1',
    };

    it('should create a reservation with valid input', async () => {
      findAvailableRoom.mockResolvedValue('room-uuid-1');
      markDatesBooked.mockResolvedValue(undefined);

      const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'room-uuid-1', name: 'Cabana 1', base_rate_usd: 199 },
          error: null,
        }),
      };

      // Track call count for confirmation number collision check
      let fromCallCount = 0;
      const supabase: any = {
        from: jest.fn((table: string) => {
          fromCallCount++;
          if (table === 'rooms') {
            return {
              ...chain,
              single: jest.fn().mockResolvedValue({
                data: { id: 'room-uuid-1', name: 'Cabana 1', base_rate_usd: 199 },
                error: null,
              }),
            };
          }
          if (table === 'reservations' && fromCallCount <= 3) {
            // Confirmation number check — no collision
            return {
              ...chain,
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (table === 'reservations') {
            // Insert reservation
            return {
              ...chain,
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'res-uuid-1' }, error: null }),
                }),
              }),
            };
          }
          return chain;
        }),
      };

      const result = await createReservation(supabase, baseInput);

      expect(result.roomId).toBe('room-uuid-1');
      expect(result.roomType).toBe('cabana_1br');
      expect(result.nights).toBe(3);
      expect(result.baseRate).toBe(199);
      expect(result.totalRoomCost).toBe(597);
      expect(result.confirmationNumber).toMatch(/^LP-[A-Z2-9]{6}$/);
      expect(findAvailableRoom).toHaveBeenCalledWith(supabase, 'cabana_1br', '2026-04-01', '2026-04-04');
      expect(markDatesBooked).toHaveBeenCalled();
    });

    it('should throw when no rooms are available', async () => {
      findAvailableRoom.mockResolvedValue(null);

      const supabase: any = { from: jest.fn() };

      await expect(createReservation(supabase, baseInput)).rejects.toThrow(
        /No.*rooms available/,
      );
    });

    it('should apply percentage promo code correctly', async () => {
      findAvailableRoom.mockResolvedValue('room-uuid-1');
      markDatesBooked.mockResolvedValue(undefined);

      // Build a supabase mock that handles promo_codes, reservations, etc.
      const supabase: any = {
        from: jest.fn((table: string) => {
          const base: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };

          if (table === 'rooms') {
            base.single = jest.fn().mockResolvedValue({
              data: { id: 'room-uuid-1', name: 'Cabana 1', base_rate_usd: 199 },
              error: null,
            });
          }
          if (table === 'promo_codes') {
            base.maybeSingle = jest.fn().mockResolvedValue({
              data: {
                id: 'promo-uuid-1',
                code: 'SAVE10',
                active: true,
                discount_type: 'percent',
                discount_value: 10,
                max_discount: 100,
                valid_from: null,
                valid_to: null,
                max_uses: null,
                current_uses: 0,
                room_type: null,
                min_booking_amount: null,
                single_use_per_guest: false,
              },
              error: null,
            });
          }
          if (table === 'reservations') {
            base.insert = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'res-uuid-1' }, error: null }),
              }),
            });
          }
          if (table === 'promo_code_usage') {
            base.insert = jest.fn().mockResolvedValue({ data: null, error: null });
          }
          return base;
        }),
      };

      const result = await createReservation(supabase, {
        ...baseInput,
        promoCode: 'SAVE10',
      });

      expect(result.promoDiscount).toBe(59.7); // 597 * 10%
      expect(result.promoCodeApplied).toBe('SAVE10');
    });
  });

  describe('markReservationPaid', () => {
    it('should mark reservation as paid and return confirmation number', async () => {
      const reservationData = {
        id: 'res-uuid-1',
        confirmation_number: 'LP-ABC123',
        guest_id: 'guest-1',
        room_type: 'cabana_1br',
        base_rate: 199,
        nights: 3,
        total_room_cost: 597,
        total_amount: 597,
        check_in: '2026-04-01',
        check_out: '2026-04-04',
        promo_discount: 0,
      };

      const supabase: any = {
        from: jest.fn((table: string) => {
          const base: any = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };

          if (table === 'reservations') {
            // update(...).eq(...).eq(...).select(...).maybeSingle()
            base.update = jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: reservationData,
                      error: null,
                    }),
                  }),
                }),
              }),
            });
          }
          if (table === 'invoices') {
            base.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
            base.insert = jest.fn().mockResolvedValue({ data: null, error: null });
          }
          if (table === 'tour_bookings') {
            base.select = jest.fn().mockReturnThis();
            base.eq = jest.fn().mockReturnThis();
            // Return empty tours array
            return { ...base, then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn) };
          }
          return base;
        }),
      };

      const confirmNum = await markReservationPaid(supabase, 'booking-1', 'pi_123', 'stripe');
      expect(confirmNum).toBe('LP-ABC123');
    });

    it('should return null if reservation already paid (idempotent)', async () => {
      const supabase: any = {
        from: jest.fn(() => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        })),
      };

      const result = await markReservationPaid(supabase, 'booking-1', 'pi_123', 'stripe');
      expect(result).toBeNull();
    });
  });

  describe('cancelReservation', () => {
    it('should update status to cancelled and release dates', async () => {
      const updateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase: any = {
        from: jest.fn(() => ({
          update: updateFn,
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        })),
      };

      await cancelReservation(supabase, 'res-uuid-1');
      expect(supabase.from).toHaveBeenCalledWith('reservations');
      expect(releaseDates).toHaveBeenCalledWith(supabase, 'res-uuid-1');
    });
  });
});
