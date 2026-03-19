// pages/api/log-client-error.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { context, error, userAgent, url, timestamp } = req.body || {};
  // TODO: Integrate with a real monitoring/logging service
  // For now, just log to server console
  // In production, use Sentry, Logtail, Datadog, etc.
  console.error("[ClientError]", { context, error, userAgent, url, timestamp });
  res.status(200).json({ ok: true });
}
