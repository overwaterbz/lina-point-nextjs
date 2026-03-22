export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { context, error, userAgent, url, timestamp } = await request.json();
  // TODO: Integrate with a real monitoring/logging service (Sentry, Logtail, Datadog, etc.)
  console.error("[ClientError]", { context, error, userAgent, url, timestamp });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
