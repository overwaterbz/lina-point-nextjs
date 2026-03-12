/* Lightweight analytics helper — wraps GA4 + Vercel events */

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: EventParams) {
  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params);
  }
}

/** Parse UTM params from current URL and store in sessionStorage */
export function captureUtmParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const utm: Record<string, string> = {};
  for (const key of utmKeys) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem('lp_utm', JSON.stringify(utm));
  }
}

export function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem('lp_utm') || '{}');
  } catch {
    return {};
  }
}
