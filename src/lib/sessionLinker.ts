/**
 * Cross-site session linker for the Point Enterprise ecosystem.
 * Links sessions across overwater.com, linapoint.com, magic.overwater.com,
 * kylapoint.com, pointrealtor.com, and pointenterprise.com.
 *
 * When a user clicks an ecosystem link with utm_source, this module:
 * 1. Reads the referring site's session info from UTM params
 * 2. Creates or retrieves the local session ID
 * 3. Logs a cross-site visit event to Supabase
 */

import { createClient } from "@supabase/supabase-js";

const SITE_KEY = "lina-point";
const SESSION_KEY = "lp_session_id";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function getLocalSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export interface CrossSiteVisit {
  from_site: string;
  to_site: string;
  session_id: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Detect and log cross-site visits from ecosystem UTM params.
 * Call this on page load (e.g., in a useEffect or layout component).
 */
export async function linkCrossSiteSession(): Promise<CrossSiteVisit | null> {
  if (typeof window === "undefined" || !supabase) return null;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");

  const ecosystemSources = [
    "overwater",
    "lina-point",
    "magic-is-you",
    "kyla-point",
    "point-realtor",
    "point-enterprise",
  ];

  if (!utmSource || !ecosystemSources.includes(utmSource)) return null;
  if (utmSource === SITE_KEY) return null; // self-referral

  const sessionId = getLocalSessionId();
  const visit: CrossSiteVisit = {
    from_site: utmSource,
    to_site: SITE_KEY,
    session_id: sessionId,
    utm_medium: utmMedium ?? undefined,
    utm_campaign: utmCampaign ?? undefined,
  };

  try {
    await supabase.from("events").insert({
      event: "cross_site_visit",
      source: SITE_KEY,
      session_id: sessionId,
      properties: {
        from_site: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      },
      page_url: window.location.pathname,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never break the app for analytics
  }

  return visit;
}
