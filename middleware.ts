import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/",
  "/rooms",
  "/experiences",
  "/concierge",
  "/gallery",
  "/terms",
  "/privacy",
];

// SEO / static routes that should never hit auth
const SEO_ROUTES = [
  "/sitemap.xml",
  "/robots.txt",
  "/favicon.ico",
  "/favicon.svg",
];

// API routes that handle their own auth (cron jobs, webhooks)
const SELF_AUTH_API_ROUTES = [
  "/api/cron/",
  "/api/availability",
  "/api/whatsapp-webhook",
  "/api/whatsapp-proactive",
  "/api/stripe/webhook",
  "/api/square/webhook",
  "/api/system/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();
  const start = Date.now();

  // Allow SEO routes through without any processing
  if (SEO_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Security headers applied to all responses
  const securityHeaders: Record<string, string> = {
    "x-request-id": requestId,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  // CSRF: Verify origin on mutating requests to API routes (except webhooks/cron)
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (
    pathname.startsWith("/api/") &&
    mutatingMethods.includes(request.method) &&
    !SELF_AUTH_API_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([k, v]) =>
      response.headers.set(k, v),
    );
    return response;
  }

  // API routes that handle their own auth pass through with tracing
  if (SELF_AUTH_API_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([k, v]) =>
      response.headers.set(k, v),
    );
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated and trying to access protected route
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Add security + tracing headers
  Object.entries(securityHeaders).forEach(([k, v]) =>
    response.headers.set(k, v),
  );

  // Log API requests in development
  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/api/")) {
    const duration = Date.now() - start;
    console.log(
      `[API] ${request.method} ${pathname} | ${duration}ms | rid:${requestId.slice(0, 8)}`,
    );
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
