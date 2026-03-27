/* Lightweight analytics helper — wraps GA4 + Vercel + Supabase events */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("lp_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("lp_session_id", sid);
  }
  return sid;
}

export function trackEvent(
  name: string,
  params?: EventParams & {
    content_calendar_id?: string;
    campaign_id?: string;
    brand?: string;
  },
) {
  // Google Analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }

  // Supabase ecosystem events
  if (supabase) {
    supabase
      .from("events")
      .insert({
        event: name,
        properties: params ?? {},
        source: params?.brand || "lina-point",
        session_id: getSessionId(),
        page_url:
          typeof window !== "undefined" ? window.location.pathname : null,
        content_calendar_id: params?.content_calendar_id,
        campaign_id: params?.campaign_id,
        brand: params?.brand,
        created_at: new Date().toISOString(),
      })
      .then(
        () => {},
        () => {},
      );
  }
}

/** Parse UTM params from current URL and store in sessionStorage */
export function captureUtmParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  const utm: Record<string, string> = {};
  for (const key of utmKeys) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem("lp_utm", JSON.stringify(utm));
  }
}

export function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem("lp_utm") || "{}");
  } catch {
    return {};
  }
}
