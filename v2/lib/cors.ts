// Shared CORS for the public intake routes. The static midsesh.com site posts
// to these routes cross-origin, so reflect Access-Control-Allow-Origin for the
// midsesh.com origins only. Same-origin requests get no CORS headers and work
// unchanged.

const ALLOWED_ORIGINS = new Set([
  "https://midsesh.com",
  "https://www.midsesh.com",
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
  return {};
}
