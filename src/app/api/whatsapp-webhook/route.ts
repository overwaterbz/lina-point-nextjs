import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import crypto from 'crypto';
import { runWhatsAppConciergeAgent } from '@/lib/agents/whatsappConciergeAgent';
import { normalizePhoneNumber, sendWhatsAppMessage } from '@/lib/whatsapp';
import { runPriceScout } from '@/lib/priceScoutAgent';
import { runExperienceCurator } from '@/lib/experienceCuratorAgent';
import { createAgentRun, finishAgentRun } from '@/lib/agents/agentRunLogger';
import { generateMagicContent } from '@/lib/magicContent';
import { checkAvailability } from '@/lib/inventory';
import { getReservation } from '@/lib/bookingFulfillment';
import { generateTripPlan } from '@/lib/agents/tripPlannerAgent';
import { logInteraction } from '@/lib/agents/guestIntelligenceAgent';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function requireWebhookUrl() {
  const url = process.env.TWILIO_WEBHOOK_URL;
  if (!url) throw new Error('TWILIO_WEBHOOK_URL not configured');
  return url;
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase service role not configured');
    }

    if (!process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_AUTH_TOKEN not configured');
    }

    const signature = request.headers.get('x-twilio-signature') || '';
    const webhookUrl = requireWebhookUrl();
    const formData = await request.formData();

    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN || '',
      signature,
      webhookUrl,
      params
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const fromRaw = params.From || '';
    const message = params.Body || '';
    const messageSid = params.MessageSid || null;
    const phone = normalizePhoneNumber(fromRaw);

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phone)
      .maybeSingle();

    const { data: existingSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone_number', phone)
      .maybeSingle();

    const existingContext = (existingSession?.context as any) || { messages: [], pending_action: null };
    const sessionMessages = (existingSession?.last_messages as any) || existingContext.messages || [];
    const sessionContext = { ...existingContext, messages: sessionMessages };

    let sessionId = existingSession?.id || null;
    const nowIso = new Date().toISOString();

    if (!existingSession) {
      const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert({
          phone_number: phone,
          user_id: profile?.user_id || null,
          last_message: message,
          context: sessionContext,
          last_messages: sessionContext.messages,
          last_inbound_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (newSession?.id) {
        sessionId = newSession.id;
        await supabase
          .from('whatsapp_messages')
          .insert({
            session_id: newSession.id,
            user_id: profile?.user_id || null,
            phone_number: phone,
            direction: 'inbound',
            body: message,
            twilio_sid: messageSid,
          });
      }
    } else {
      await supabase
        .from('whatsapp_messages')
        .insert({
          session_id: sessionId,
          user_id: profile?.user_id || null,
          phone_number: phone,
          direction: 'inbound',
          body: message,
          twilio_sid: messageSid,
        });
    }

    const runStart = Date.now();
    let conciergeRunId: string | null = null;

    if (profile?.user_id) {
      try {
        conciergeRunId = await createAgentRun(supabase as any, {
          user_id: profile.user_id,
          agent_name: 'whatsapp_concierge',
          request_id: messageSid || undefined,
          input: { message, phone },
        });
      } catch (logError) {
        console.warn('[WhatsApp] Failed to create agent run:', logError);
      }
    }

    const agentResult = await runWhatsAppConciergeAgent({
      message,
      phone,
      profile,
      sessionContext,
    });

    if (conciergeRunId) {
      try {
        await finishAgentRun(supabase as any, conciergeRunId, {
          status: 'completed',
          output: { reply: agentResult.replyText, action: agentResult.action },
          duration_ms: Date.now() - runStart,
        });
      } catch (logError) {
        console.warn('[WhatsApp] Failed to finalize agent run:', logError);
      }
    }

    let replyText = agentResult.replyText;
    const pending = agentResult.updatedContext.pending_action;
    let actionHandled = false;

    if (pending?.type === 'book_flow') {
      const data = pending.data || {};
      if (!data.checkInDate || !data.checkOutDate) {
        replyText = `${replyText}\n\nTo start booking, send dates like 2026-03-10 to 2026-03-14.`;
      } else if (!profile?.user_id) {
        replyText = `${replyText}\n\nPlease sign up with the same WhatsApp number so I can book for you.`;
      } else {
        actionHandled = true;
        let priceRunId: string | null = null;
        try {
          priceRunId = await createAgentRun(supabase as any, {
            user_id: profile.user_id,
            agent_name: 'price_scout',
            request_id: messageSid || undefined,
            input: data,
          });
        } catch (logError) {
          console.warn('[WhatsApp] Failed to create PriceScout run:', logError);
        }

        const priceResult = await runPriceScout(
          data.roomType || 'overwater room',
          data.checkInDate,
          data.checkOutDate,
          data.location || 'Belize'
        );

        if (priceRunId) {
          try {
            await finishAgentRun(supabase as any, priceRunId, {
              status: 'completed',
              output: JSON.stringify(priceResult) as any,
              duration_ms: Date.now() - runStart,
            });
          } catch (logError) {
            console.warn('[WhatsApp] Failed to finalize PriceScout run:', logError);
          }
        }

        let curatorRunId: string | null = null;
        try {
          curatorRunId = await createAgentRun(supabase as any, {
            user_id: profile.user_id,
            agent_name: 'experience_curator',
            request_id: messageSid || undefined,
            input: { groupSize: data.groupSize || 2, tourBudget: data.tourBudget || 500 },
          });
        } catch (logError) {
          console.warn('[WhatsApp] Failed to create Curator run:', logError);
        }

        const curatorResult = await runExperienceCurator(
          {
            interests: data.interests || ['snorkeling', 'dining'],
            activityLevel: data.activityLevel || 'medium',
            budget: data.tourBudget > 500 ? 'luxury' : data.tourBudget > 300 ? 'mid' : 'budget',
          },
          data.groupSize || 2,
          data.tourBudget || 500
        );

        if (curatorRunId) {
          try {
            await finishAgentRun(supabase as any, curatorRunId, {
              status: 'completed',
              output: JSON.stringify(curatorResult) as any,
              duration_ms: Date.now() - runStart,
            });
          } catch (logError) {
            console.warn('[WhatsApp] Failed to finalize Curator run:', logError);
          }
        }

        await supabase.from('prices').insert({
          room_type: data.roomType || 'overwater room',
          check_in_date: data.checkInDate,
          check_out_date: data.checkOutDate,
          location: data.location || 'Belize',
          ota_name: priceResult.bestOTA,
          price: priceResult.bestPrice,
          beat_price: priceResult.beatPrice,
          url: priceResult.priceUrl,
          user_id: profile.user_id,
        });

        const bookingId = crypto.randomUUID();
        await supabase.from('tour_bookings').insert(
          curatorResult.tours.map((tour: any) => ({
            user_id: profile.user_id,
            booking_id: bookingId,
            tour_name: tour.name,
            tour_type: tour.type,
            price: tour.price,
            affiliate_link: tour.url,
            commission_earned: tour.price * 0.1,
            status: 'pending_payment',
          }))
        );

        replyText = `I found a direct beat price of $${priceResult.beatPrice} (save ${priceResult.savingsPercent}%). Top tours: ${curatorResult.tours
          .slice(0, 2)
          .map((t: any) => t.name)
          .join(' + ')}. Reply YES to continue or ask to refine.`;
      }
    }

    if (pending?.type === 'magic_content') {
      const data = pending.data || {};
      if (!data.reservationId || !data.occasion) {
        replyText = `${replyText}\n\nSend your reservation ID and occasion (birthday, anniversary, proposal).`;
      } else if (!profile?.user_id) {
        replyText = `${replyText}\n\nPlease sign up with the same WhatsApp number so I can deliver your magic content.`;
      } else if (!profile?.opt_in_magic) {
        replyText = `${replyText}\n\nEnable Magic in your profile first, then reply here again.`;
      } else {
        actionHandled = true;
        let magicRunId: string | null = null;
        try {
          magicRunId = await createAgentRun(supabase as any, {
            user_id: profile.user_id,
            agent_name: 'content_magic',
            request_id: messageSid || undefined,
            input: data,
          });
        } catch (logError) {
          console.warn('[WhatsApp] Failed to create Magic run:', logError);
        }

        const contentResult = await generateMagicContent(supabase as any, {
          userId: profile.user_id,
          reservationId: data.reservationId,
          occasion: data.occasion,
          musicStyle: data.genre || 'ambient',
        }, profile);

        if (magicRunId) {
          try {
            await finishAgentRun(supabase as any, magicRunId, {
              status: 'completed',
              output: contentResult as any,
              duration_ms: Date.now() - runStart,
            });
          } catch (logError) {
            console.warn('[WhatsApp] Failed to finalize Magic run:', logError);
          }
        }
        const songUrl = contentResult.items.find((item) => item.contentType === 'song')?.mediaUrl;
        const videoUrl = contentResult.items.find((item) => item.contentType === 'video')?.mediaUrl;
        const parts = [songUrl ? `Song: ${songUrl}` : null, videoUrl ? `Video: ${videoUrl}` : null].filter(Boolean);
        replyText = parts.length > 0
          ? `Your magic is ready. ${parts.join(' ')}`
          : 'Your magic is in progress. I will follow up soon.';
      }
    }

    // ── Check Reservation ────────────────────────────────────
    if (pending?.type === 'check_reservation') {
      const data = pending.data || {};
      // Try to extract LP-XXXXXX from the message
      const lpMatch = message.match(/LP-[A-Z0-9]{6}/i);
      const confNum = lpMatch?.[0]?.toUpperCase() || data.confirmationNumber;

      if (!confNum) {
        replyText = `${replyText}\n\nSend your confirmation number (like LP-AB3K7X) and I'll look it up.`;
      } else {
        actionHandled = true;
        try {
          const res = await getReservation(supabase, confNum);
          if (res) {
            const checkInDate = new Date(res.check_in_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const checkOutDate = new Date(res.check_out_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            replyText = `✅ *${confNum}*\n📍 ${res.room_type.replace(/_/g, ' ')}\n📅 ${checkInDate} → ${checkOutDate}\n💳 ${res.payment_status}\n📋 ${res.status}\n\nNeed to change anything?`;
          } else {
            replyText = `I couldn't find a reservation with ${confNum}. Double-check the number and try again.`;
          }
        } catch {
          replyText = `I had trouble looking that up. Try again in a moment.`;
        }
      }
    }

    // ── Check Availability ───────────────────────────────────
    if (pending?.type === 'check_availability') {
      const data = pending.data || {};
      if (!data.checkInDate || !data.checkOutDate) {
        replyText = `${replyText}\n\nSend dates like 2026-03-10 to 2026-03-14 and I'll check availability.`;
      } else {
        actionHandled = true;
        try {
          const avail = await checkAvailability(supabase, data.checkInDate, data.checkOutDate);
          const lines = avail
            .map(a => `${a.available ? '✅' : '❌'} ${a.label}: ${a.availableRooms} left — $${a.baseRate}/night`)
            .join('\n');
          replyText = `*Availability ${data.checkInDate} → ${data.checkOutDate}*\n\n${lines}\n\nWant to book? Just say which room type!`;
        } catch {
          replyText = 'I had trouble checking availability. Try again shortly.';
        }
      }
    }

    // ── Book Tour ────────────────────────────────────────────
    if (pending?.type === 'book_tour' && !actionHandled) {
      actionHandled = true;
      const data = pending.data || {};
      const lower = message.toLowerCase();

      // Detect specific tour
      let tourName = 'Tour';
      if (lower.includes('snorkel') || lower.includes('hol chan')) tourName = 'Hol Chan Snorkeling';
      else if (lower.includes('fish')) tourName = 'Sport Fishing';
      else if (lower.includes('ruin') || lower.includes('mayan')) tourName = 'Mayan Ruins Day Trip';
      else if (lower.includes('cenote')) tourName = 'Cenote Swimming';
      else if (lower.includes('kayak')) tourName = 'Mangrove Kayaking';
      else if (lower.includes('dive') || lower.includes('blue hole')) tourName = 'Blue Hole Diving';
      else if (lower.includes('island')) tourName = 'Island Hopping & Beach Picnic';

      if (profile?.user_id) {
        try {
          const bookingId = crypto.randomUUID();
          await supabase.from('tour_bookings').insert({
            user_id: profile.user_id,
            booking_id: bookingId,
            tour_name: tourName,
            tour_type: tourName.toLowerCase().replace(/\s+/g, '_'),
            price: 0, // Staff confirms price
            status: 'pending_confirmation',
          });
          await logInteraction(supabase, {
            userId: profile.user_id,
            type: 'tour',
            channel: 'whatsapp',
            summary: `Requested ${tourName} via WhatsApp`,
            sentiment: 'positive',
          });
          replyText = `🐠 *${tourName}* — request received! Our team will confirm availability and pricing shortly. I'll message you back with details.`;
        } catch {
          replyText = `I noted your interest in ${tourName}. Our team will reach out to confirm. 🐠`;
        }
      } else {
        replyText = `${tourName} sounds amazing! Sign up with the same WhatsApp number so I can book it for you.`;
      }
    }

    // ── Trip Planner ─────────────────────────────────────────
    if (pending?.type === 'trip_planner' && !actionHandled) {
      const data = pending.data || {};
      if (!data.checkInDate || !data.checkOutDate) {
        replyText = `${replyText}\n\nSend your check-in and check-out dates and I'll build your dream itinerary! 📋`;
      } else if (!profile?.user_id) {
        replyText = `${replyText}\n\nSign up with the same WhatsApp number and I'll personalize your trip plan.`;
      } else {
        actionHandled = true;
        try {
          const plan = await generateTripPlan(supabase, {
            userId: profile.user_id,
            checkIn: data.checkInDate,
            checkOut: data.checkOutDate,
            roomType: data.roomType || 'suite_1st_floor',
            groupSize: data.groupSize || 2,
          });
          replyText = plan.whatsAppFormatted;
          await logInteraction(supabase, {
            userId: profile.user_id,
            type: 'booking',
            channel: 'whatsapp',
            summary: `Generated trip plan: ${plan.summary}`,
            sentiment: 'positive',
          });
        } catch {
          replyText = 'I had trouble generating your itinerary. Let me try again — send your dates once more.';
        }
      }
    }

    // ── Dining Request ───────────────────────────────────────
    if (pending?.type === 'request_dining' && !actionHandled) {
      actionHandled = true;
      replyText = `🍽 I've noted your dining request. Here are your options:\n\n*Reef Restaurant* — Fresh seafood, ocean views (7AM-10PM)\n*Palapa Bar* — Cocktails & light bites over the water (11AM-12AM)\n*Room Service* — Delivered to your door (7AM-9PM)\n\nWant me to arrange a specific time or table?`;
      if (profile?.user_id) {
        await logInteraction(supabase, {
          userId: profile.user_id,
          type: 'dining',
          channel: 'whatsapp',
          summary: `Dining request: ${message}`,
          sentiment: 'neutral',
        }).catch(() => {});
      }
    }

    // ── Complaint ────────────────────────────────────────────
    if (pending?.type === 'complaint' && !actionHandled) {
      actionHandled = true;
      replyText = `I'm sorry to hear that. I've flagged this for our management team, and someone will follow up with you shortly. Is there anything I can do right now to help?`;
      if (profile?.user_id) {
        await logInteraction(supabase, {
          userId: profile.user_id,
          type: 'complaint',
          channel: 'whatsapp',
          summary: message,
          sentiment: 'negative',
        }).catch(() => {});
      }
      // Notify admin via email
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && adminEmails.length > 0) {
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Lina Point Alerts <alerts@linapoint.com>',
            to: adminEmails,
            subject: `⚠️ Guest Complaint — ${profile?.full_name || phone}`,
            html: `<p><strong>From:</strong> ${profile?.full_name || 'Unknown'} (${phone})</p><p><strong>Message:</strong> ${message}</p><p>Please follow up promptly.</p>`,
          }),
        }).catch(() => {});
      }
    }

    const trimmedContext = agentResult.updatedContext;
    if (trimmedContext.messages.length > 0) {
      const lastMessage = trimmedContext.messages[trimmedContext.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        lastMessage.content = replyText;
      }
    }

    if (actionHandled) {
      trimmedContext.pending_action = null;
    }

    trimmedContext.messages = trimmedContext.messages.slice(-5);

    await supabase
      .from('whatsapp_sessions')
      .upsert({
        id: sessionId || undefined,
        phone_number: phone,
        user_id: profile?.user_id || null,
        last_message: message,
        context: trimmedContext,
        last_messages: trimmedContext.messages,
        last_inbound_at: nowIso,
        updated_at: nowIso,
      });

    const outbound = await sendWhatsAppMessage(phone, replyText);

    await supabase.from('whatsapp_messages').insert({
      session_id: sessionId || undefined,
      user_id: profile?.user_id || null,
      phone_number: phone,
      direction: 'outbound',
      body: replyText,
      twilio_sid: outbound.sid,
    });

    await supabase
      .from('whatsapp_sessions')
      .update({ last_outbound_at: new Date().toISOString() })
      .eq('phone_number', phone);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WhatsApp] Webhook error', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
