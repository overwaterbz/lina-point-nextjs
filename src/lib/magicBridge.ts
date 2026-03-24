/**
 * Magic Bridge — Cross-project integration with Magic Is You.
 *
 * When a Lina Point guest's booking is paid, this module auto-creates
 * (or finds) a Magic Is You account and grants free Dreamweaver access
 * for the duration of their stay via the shared property_guests table.
 *
 * Both projects share the same Supabase instance (seonmgpsyyzbpcsrzjxi),
 * so the property_guests table is directly accessible.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface MagicAccessResult {
  userId: string;
  isNewUser: boolean;
  magicLoginUrl: string;
}

/**
 * Grant a Lina Point guest free Dreamweaver access on Magic Is You.
 *
 * 1. Finds existing auth user by email, or creates one via Admin API.
 * 2. Upserts a property_guests row with expiry = checkOut + 1 day.
 * 3. Returns the user ID and a login link.
 */
export async function grantMagicAccess(
  supabase: SupabaseClient,
  email: string,
  fullName: string,
  bookingId: string,
  checkIn: string,
  checkOut: string,
): Promise<MagicAccessResult | null> {
  try {
    // Expiry = checkout date + 1 day (so they have access through checkout day)
    const expiresAt = new Date(checkOut + "T23:59:59Z");
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Try to find existing user by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Search by email across all users
    let userId: string | null = null;
    let isNewUser = false;

    // Use admin API to look up user by email
    const { data: userList } = (await supabase
      .rpc("get_user_by_email", {
        lookup_email: email,
      })
      .maybeSingle()) as { data: { id: string } | null };

    if (userList?.id) {
      userId = userList.id;
    }

    // If no RPC available, try admin.listUsers with filter
    if (!userId) {
      // The admin API doesn't support email filtering directly,
      // so we check if this email exists in profiles or auth
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (profile?.user_id) {
        userId = profile.user_id;
      }
    }

    // Create a new user if not found
    if (!userId) {
      const tempPassword = generateSecurePassword();

      const { data: newUser, error: createErr } =
        await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm so they can log in immediately
          user_metadata: {
            full_name: fullName,
            source: "lina_point_booking",
            booking_id: bookingId,
          },
        });

      if (createErr || !newUser?.user) {
        console.error(
          "[MagicBridge] Failed to create user:",
          createErr?.message,
        );
        return null;
      }

      userId = newUser.user.id;
      isNewUser = true;

      // They'll use "Forgot Password" on Magic Is You to set their own password
      // or we can send a magic link
    }

    // Upsert property_guests row — gives free Dreamweaver access
    const { error: guestErr } = await supabase.from("property_guests").upsert(
      {
        user_id: userId,
        property: "lina_point",
        source: "booking",
        booking_id: bookingId,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id,property" },
    );

    if (guestErr) {
      console.error(
        "[MagicBridge] Failed to upsert property_guests:",
        guestErr.message,
      );
      // Non-fatal: the user still has an account, just no free access
    }

    const magicLoginUrl = "https://magic.overwater.com/auth/login";

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[MagicBridge] ${isNewUser ? "Created" : "Found"} Magic Is You account for ${email} (expires ${expiresAt.toISOString().split("T")[0]})`,
      );
    }

    return { userId, isNewUser, magicLoginUrl };
  } catch (err) {
    console.error("[MagicBridge] Unexpected error:", err);
    return null;
  }
}

/**
 * Generate a secure random password for auto-created accounts.
 * Guests will use "Forgot Password" to set their own.
 */
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const length = 24;
  const values = new Uint8Array(length);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}
