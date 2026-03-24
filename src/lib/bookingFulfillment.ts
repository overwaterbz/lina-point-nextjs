import { SupabaseClient } from "@supabase/supabase-js";
import {
  selectBestRoom,
  markDatesBooked,
  resolveRoomType,
  getRoomTypeInfo,
} from "./inventory";
import type { RoomType } from "./inventory";
import { fireN8nWorkflow } from "./n8nClient";

/**
 * Generate a human-friendly confirmation number: LP-XXXXXX
 */
function generateConfirmationNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `LP-${code}`;
}

export interface CreateReservationInput {
  guestId: string;
  roomTypeInput: string; // display name from form, e.g. "overwater bungalow"
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestsCount: number;
  totalAmount: number; // room + tours + dining
  bookingId: string; // links to tour_bookings
  specialRequests?: string;
  promoCode?: string; // optional promo code to apply
  // Guest profile enrichment (forwarded from StepMagicFamily)
  interests?: string[];
  activityLevel?: string;
  anniversary?: string;
  birthday?: string;
  musicStyle?: string;
}

export interface ReservationResult {
  reservationId: string;
  confirmationNumber: string;
  roomId: string;
  roomType: RoomType;
  roomName: string;
  baseRate: number;
  nights: number;
  totalRoomCost: number;
  promoDiscount?: number;
  promoCodeApplied?: string;
}

/**
 * Create a reservation: find room, mark inventory, insert reservation row.
 * Throws if no availability.
 */
export async function createReservation(
  supabase: SupabaseClient,
  input: CreateReservationInput,
): Promise<ReservationResult> {
  const roomType = resolveRoomType(input.roomTypeInput);
  const info = getRoomTypeInfo(roomType);

  // Find the best available room, personalized to guest profile
  const roomId = await selectBestRoom(
    supabase,
    roomType,
    input.checkIn,
    input.checkOut,
    {
      anniversary: input.anniversary,
      birthday: input.birthday,
      groupSize: input.guestsCount,
    },
  );
  if (!roomId) {
    throw new Error(
      `No ${info.label} rooms available for ${input.checkIn} to ${input.checkOut}`,
    );
  }

  // Get room details + nightly rate
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, name, base_rate_usd")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) throw new Error("Failed to load room details");

  const nights = Math.round(
    (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const baseRate = Number(room.base_rate_usd);
  const totalRoomCost = baseRate * nights;

  // Generate unique confirmation number (retry on collision)
  let confirmationNumber = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateConfirmationNumber();
    const { data: existing } = await supabase
      .from("reservations")
      .select("id")
      .eq("confirmation_number", candidate)
      .maybeSingle();

    if (!existing) {
      confirmationNumber = candidate;
      break;
    }
  }
  if (!confirmationNumber)
    throw new Error("Failed to generate unique confirmation number");

  // Validate and apply promo code if provided
  let promoDiscount = 0;
  let promoCodeId: string | null = null;
  let promoCodeApplied: string | undefined;

  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (promo) {
      const now = new Date();
      const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
      const validTo = promo.valid_to ? new Date(promo.valid_to) : null;
      const withinDates =
        (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
      const withinUses = !promo.max_uses || promo.current_uses < promo.max_uses;
      const roomOk = !promo.room_type || promo.room_type === roomType;
      const meetsMin =
        !promo.min_booking_amount ||
        input.totalAmount >= promo.min_booking_amount;

      if (withinDates && withinUses && roomOk && meetsMin) {
        // Check single-use-per-guest
        let singleUseOk = true;
        if (promo.single_use_per_guest) {
          const { data: prior } = await supabase
            .from("promo_code_usage")
            .select("id")
            .eq("promo_code_id", promo.id)
            .eq("user_id", input.guestId)
            .maybeSingle();
          if (prior) singleUseOk = false;
        }

        if (singleUseOk) {
          if (promo.discount_type === "percent") {
            promoDiscount =
              Math.round(
                input.totalAmount * (promo.discount_value / 100) * 100,
              ) / 100;
          } else {
            promoDiscount = Number(promo.discount_value);
          }
          if (promo.max_discount && promoDiscount > promo.max_discount) {
            promoDiscount = Number(promo.max_discount);
          }
          promoCodeId = promo.id;
          promoCodeApplied = code;
        }
      }
    }
  }

  const finalAmount =
    Math.round((input.totalAmount - promoDiscount) * 100) / 100;

  // Insert reservation
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .insert({
      confirmation_number: confirmationNumber,
      guest_id: input.guestId,
      room_id: roomId,
      room_type: roomType,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights,
      guests_count: input.guestsCount,
      base_rate: baseRate,
      total_room_cost: totalRoomCost,
      total_amount: finalAmount,
      payment_status: "pending",
      booking_id: input.bookingId,
      special_requests: input.specialRequests || null,
      status: "confirmed",
      ...(promoCodeId
        ? { promo_code_id: promoCodeId, promo_discount: promoDiscount }
        : {}),
    })
    .select("id")
    .single();

  if (resErr || !reservation)
    throw new Error(
      "Failed to create reservation: " + (resErr?.message || "unknown"),
    );

  // Record promo usage & increment counter
  if (promoCodeId) {
    await supabase.from("promo_code_usage").insert({
      promo_code_id: promoCodeId,
      user_id: input.guestId,
      reservation_id: reservation.id,
      discount_applied: promoDiscount,
    });
    // Increment current_uses on the promo code (optimistic lock to reduce race window)
    const { data: currentPromo } = await supabase
      .from("promo_codes")
      .select("current_uses")
      .eq("id", promoCodeId)
      .single();
    if (currentPromo) {
      // Conditional update: only succeeds if current_uses hasn't changed since read
      await supabase
        .from("promo_codes")
        .update({ current_uses: (currentPromo.current_uses || 0) + 1 })
        .eq("id", promoCodeId)
        .eq("current_uses", currentPromo.current_uses); // optimistic lock
    }
  }

  // Mark inventory dates as booked
  await markDatesBooked(
    supabase,
    roomId,
    input.checkIn,
    input.checkOut,
    reservation.id,
  );

  // Upsert guest intelligence for personalization (non-fatal)
  try {
    const intelData: Record<string, unknown> = {
      guest_id: input.guestId,
      room_type_preference: roomType,
      last_booking_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };
    if (input.interests?.length) intelData.interest_tags = input.interests;
    if (input.activityLevel) intelData.activity_level = input.activityLevel;
    if (input.anniversary) intelData.anniversary = input.anniversary;
    if (input.birthday) intelData.birthday = input.birthday;
    if (input.musicStyle) intelData.music_style = input.musicStyle;
    await supabase
      .from("guest_intelligence")
      .upsert(intelData, { onConflict: "guest_id" });
  } catch {
    // non-fatal: personalization data is best-effort
  }

  return {
    reservationId: reservation.id,
    confirmationNumber,
    roomId,
    roomType,
    roomName: room.name,
    baseRate,
    nights,
    totalRoomCost,
    ...(promoDiscount > 0 ? { promoDiscount, promoCodeApplied } : {}),
  };
}

/**
 * Mark a reservation as paid after payment webhook confirms success.
 * Also generates an invoice automatically.
 */
export async function markReservationPaid(
  supabase: SupabaseClient,
  bookingId: string,
  paymentId: string,
  processor: "square" | "stripe",
): Promise<string | null> {
  const { data, error } = await supabase
    .from("reservations")
    .update({
      payment_status: "paid",
      payment_processor: processor,
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
    .eq("payment_status", "pending") // idempotent: only update if still pending
    .select(
      "id, confirmation_number, guest_id, room_type, base_rate, nights, total_room_cost, total_amount, check_in, check_out, promo_discount, booking_id",
    )
    .maybeSingle();

  if (error) {
    console.warn("[BookingFulfillment] Failed to mark paid:", error.message);
    return null;
  }

  if (!data) return null;

  // Auto-generate invoice
  try {
    await generateInvoice(supabase, data);
  } catch (invErr) {
    console.warn("[BookingFulfillment] Invoice generation failed:", invErr);
  }

  // Grant free Magic Is You Dreamweaver access for the stay
  try {
    const { data: guest } = await supabase.auth.admin.getUserById(
      data.guest_id,
    );
    if (guest?.user?.email) {
      const { grantMagicAccess } = await import("./magicBridge");
      await grantMagicAccess(
        supabase,
        guest.user.email,
        guest.user.user_metadata?.full_name || guest.user.email.split("@")[0],
        bookingId,
        data.check_in,
        data.check_out,
      );
    }
  } catch (bridgeErr) {
    console.warn(
      "[BookingFulfillment] Magic bridge failed (non-fatal):",
      bridgeErr,
    );
  }

  // Award loyalty points: 1 point per $1 paid (non-fatal)
  try {
    const pointsToAdd = Math.floor(Number(data.total_amount) || 0);
    if (pointsToAdd > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("loyalty_points")
        .eq("user_id", data.guest_id)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({
            loyalty_points: (profile.loyalty_points || 0) + pointsToAdd,
          })
          .eq("user_id", data.guest_id);
      }
    }
  } catch {
    // Non-fatal: points can be reconciled manually if needed
  }

  // Notify n8n of new paid booking (fire-and-forget)
  fireN8nWorkflow("new-booking", {
    reservationId: bookingId,
    confirmationNumber: data.confirmation_number,
    guestId: data.guest_id,
    roomType: data.room_type,
    checkIn: data.check_in,
    checkOut: data.check_out,
    total: data.total_room_cost,
  });

  return data.confirmation_number || null;
}

/**
 * Generate an invoice for a paid reservation.
 */
async function generateInvoice(
  supabase: SupabaseClient,
  reservation: {
    id: string;
    confirmation_number: string;
    guest_id: string;
    room_type: string;
    base_rate: number;
    nights: number;
    total_room_cost: number;
    total_amount: number;
    booking_id?: string;
    promo_discount?: number | null;
  },
): Promise<void> {
  // Check if invoice already exists for this reservation
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("reservation_id", reservation.id)
    .maybeSingle();

  if (existing) return; // already invoiced

  const roomCost =
    Number(reservation.total_room_cost) ||
    Number(reservation.total_amount) ||
    0;
  const promoDiscount = Number(reservation.promo_discount) || 0;
  const taxRate = 0.125; // 12.5% Belize GST
  const subtotal = roomCost - promoDiscount;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Build line items
  const items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[] = [
    {
      description: `${reservation.room_type} — ${reservation.nights} night${reservation.nights === 1 ? "" : "s"} @ $${Number(reservation.base_rate).toFixed(2)}/night`,
      quantity: reservation.nights,
      unit_price: Number(reservation.base_rate),
      total: Number(reservation.total_room_cost),
    },
  ];

  if (promoDiscount > 0) {
    items.push({
      description: "Promo Code Discount",
      quantity: 1,
      unit_price: -promoDiscount,
      total: -promoDiscount,
    });
  }

  // Check for tour bookings associated with same booking
  const tourQuery = supabase
    .from("tour_bookings")
    .select("total_price, num_guests, tours(name)")
    .eq("user_id", reservation.guest_id)
    .eq("status", "paid");
  if (reservation.booking_id) {
    tourQuery.eq("booking_id", reservation.booking_id);
  }
  type TourRow = {
    total_price: number;
    num_guests: number | null;
    tours: { name: string } | null;
  };
  const tourResult = await tourQuery;
  const tours = tourResult.data as TourRow[] | null;

  for (const tb of tours || []) {
    if (tb.total_price > 0) {
      items.push({
        description: `Tour: ${tb.tours?.name || "Activity"}`,
        quantity: tb.num_guests || 1,
        unit_price: Number(tb.total_price) / (tb.num_guests || 1),
        total: Number(tb.total_price),
      });
    }
  }

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceNumber = `INV-${dateStr}-${rand}`;

  await supabase.from("invoices").insert({
    reservation_id: reservation.id,
    guest_id: reservation.guest_id,
    invoice_number: invoiceNumber,
    items: JSON.stringify(items),
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    status: "paid",
    issued_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
  });
}

/**
 * Cancel a reservation, apply refund policy, and issue refund if applicable.
 * Returns the refund amount and percentage applied.
 */
export async function cancelReservation(
  supabase: SupabaseClient,
  reservationId: string,
): Promise<{ refundAmount: number; refundPct: number }> {
  const { releaseDates } = await import("./inventory");

  // Fetch reservation details needed for refund calculation
  const { data: res, error: fetchErr } = await supabase
    .from("reservations")
    .select(
      "id, check_in, total_amount, payment_id, payment_processor, payment_status, status",
    )
    .eq("id", reservationId)
    .single();

  if (fetchErr || !res) throw new Error("Reservation not found");
  if (res.status === "cancelled")
    throw new Error("Reservation is already cancelled");

  // Calculate days until check-in
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(res.check_in);
  const daysUntil = Math.max(
    0,
    Math.round((checkIn.getTime() - today.getTime()) / 86400000),
  );

  // Find applicable refund tier: highest refund_pct where days_before <= daysUntil
  const { data: policies } = await supabase
    .from("refund_policies")
    .select("days_before, refund_pct")
    .eq("active", true)
    .lte("days_before", daysUntil)
    .order("days_before", { ascending: false })
    .limit(1);

  const refundPct = policies?.[0]?.refund_pct ?? 0;
  const totalAmount = Number(res.total_amount) || 0;
  const refundAmount = Math.round(totalAmount * (refundPct / 100) * 100) / 100;

  // Issue payment refund if applicable
  if (res.payment_status === "paid" && res.payment_id && refundAmount > 0) {
    if (res.payment_processor === "stripe") {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.refunds.create({
          payment_intent: res.payment_id,
          amount: Math.round(refundAmount * 100), // convert to cents
        });
      } catch (refundErr) {
        console.error("[cancelReservation] Stripe refund failed:", refundErr);
        // Proceed with cancellation even if refund API fails
      }
    }
    if (res.payment_processor === "square") {
      // Square refunds require the Square SDK — log for manual processing
      console.warn(
        `[cancelReservation] Square refund required: payment_id=${res.payment_id}, amount=$${refundAmount}. Process manually in Square Dashboard.`,
      );
    }
  }

  // Update reservation status
  const { error: cancelErr } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      payment_status: refundAmount > 0 ? "refunded" : res.payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (cancelErr)
    throw new Error("Failed to cancel reservation: " + cancelErr.message);

  // Release inventory dates
  await releaseDates(supabase, reservationId);

  // Write admin notification
  await supabase.from("notifications").insert({
    type: "reservation_cancelled",
    title: "Reservation Cancelled",
    message: `Reservation ${reservationId} cancelled. Refund: $${refundAmount} (${refundPct}% of $${totalAmount})`,
    user_id: null,
    read: false,
  });

  return { refundAmount, refundPct };
}

/**
 * Look up reservation by confirmation number.
 */
export async function getReservation(
  supabase: SupabaseClient,
  confirmationNumber: string,
) {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      rooms (name, room_type, amenities, description)
    `,
    )
    .eq("confirmation_number", confirmationNumber.toUpperCase())
    .maybeSingle();

  if (error) throw new Error("Failed to look up reservation: " + error.message);
  return data;
}
