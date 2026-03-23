/**
 * Environment variable validation — runs at build time and server startup.
 * Import this in your root layout or middleware to catch missing config early.
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROK_API_KEY",
  "RESEND_API_KEY",
  "TAVILY_API_KEY",
  "CRON_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
] as const;

const optional = [
  "NEXT_PUBLIC_SQUARE_APPLICATION_ID",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_LOCATION_ID",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SQUARE_WEBHOOK_SECRET",
  "N8N_WEBHOOK_URL",
  "N8N_WEBHOOK_SECRET",
] as const;

export function validateEnv(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  // Server-only vars — only check on server side
  if (typeof window === "undefined") {
    for (const key of requiredServer) {
      if (!process.env[key]) missing.push(key);
    }
  }

  for (const key of optional) {
    if (!process.env[key]) warnings.push(key);
  }

  if (missing.length > 0) {
    console.error(`[ENV] Missing required env vars: ${missing.join(", ")}`);
  }
  if (warnings.length > 0) {
    console.warn(`[ENV] Optional env vars not set: ${warnings.join(", ")}`);
  }

  return { valid: missing.length === 0, missing, warnings };
}

// Auto-validate on import in production — fail fast for public vars, warn for server-only
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  const result = validateEnv();
  const publicMissing = result.missing.filter(
    (v) =>
      ![
        "SUPABASE_SERVICE_ROLE_KEY",
        "GROK_API_KEY",
        "RESEND_API_KEY",
        "TAVILY_API_KEY",
      ].includes(v),
  );
  if (publicMissing.length > 0) {
    throw new Error(
      `[ENV] Missing required environment variables: ${publicMissing.join(", ")}. ` +
        "Set them in your Vercel dashboard before deploying.",
    );
  }
  if (result.missing.length > publicMissing.length) {
    console.warn(
      `[ENV] Missing runtime environment variables (needed at request time): ${result.missing.filter((v) => !publicMissing.includes(v)).join(", ")}`,
    );
  }
}
