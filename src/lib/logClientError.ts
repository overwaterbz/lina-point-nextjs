// Simple client-side error logger for booking/payment flows
// Sends errors to /api/log-client-error (to be implemented server-side)
export async function logClientError(context: string, error: any) {
  try {
    await fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        error:
          typeof error === "string"
            ? error
            : error?.message || JSON.stringify(error),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Silently fail
  }
}
