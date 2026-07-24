# Security review

Phase 2 of `WORKPLAN.md`, July 2026. Findings ranked by severity, each with
the fix applied and the test that proves it. Items marked "verified safe"
were reviewed and needed no change.

## Findings and fixes

### 1. High: API endpoints could burn the Anthropic and SerpAPI quota

The only rate limit was per-instance and in-memory, so every serverless
cold start reset it, and there was no global spend ceiling at all.

Fixed with durable counters in Supabase (`usage_counters` table plus an
atomic `bump_usage` function, second migration):

- Per-IP minute buckets shared across instances, on all three routes.
- Global daily caps per route (`DAILY_CAP_CHAT` 500, `DAILY_CAP_SEARCH`
  150, `DAILY_CAP_INTROS` 200). Chat and intros return 429 over cap; search
  degrades to demo profiles so the UI keeps working.
- A SerpAPI monthly quota counter (`SERPAPI_MONTHLY_CAP`, default 250, the
  free plan). At 100% searches serve demo profiles instead of erroring;
  70% and 90% crossings are logged and appear in the daily report.
- Every check fails open: a Supabase outage never blocks a visitor.

Tests: `lib/__tests__/usage.test.ts` (counter keys, cap parsing, verdicts,
fail-open). In-memory limiter still covered by route behaviour.

### 2. High: no CSRF or origin control on state-changing endpoints

Any website could POST to `/api/chat`, `/api/search` and `/api/intros`
from a visitor's browser and burn quota or plant junk data.

Fixed: all three routes reject requests whose `Origin` header does not
match the request host (`matchesOrigin` in `lib/sanitize.ts`). Browsers
always send `Origin` on cross-site POSTs, so this closes the browser
vector; non-browser scripting is handled by finding 1.

Tests: `lib/__tests__/sanitize.test.ts`.

### 3. Medium: prompt injection via chat text, brief fields and SerpAPI snippets

Visitor text reaches the intake prompt, and SerpAPI titles/snippets (open
web content) are embedded in the ranking prompt.

Fixed in layers:

- Both system prompts now state that visitor text and search results are
  data, never instructions, with concrete examples to refuse.
- `scrubUntrusted` (`lib/sanitize.ts`) strips control characters,
  zero-width and bidi-override Unicode from every untrusted string at the
  API boundary (`parseMessages`, `coerceBrief`, intros fields) and from
  SerpAPI titles/snippets, killing invisible-instruction smuggling.
- Structured output schemas mean the model cannot return free-form text
  that skips validation; `sanitizeReply` and `finalizeExperts` re-validate
  every field regardless.

Tests: `lib/__tests__/sanitize.test.ts`, scrub assertions in
`lib/__tests__/validate.test.ts` and `lib/__tests__/serp.test.ts`.

### 4. Medium: SSRF via `INSIGHTS_WEBHOOK_URL`

A mistyped or maliciously set webhook URL would make the server POST
visitor data to internal addresses (localhost, cloud metadata at
169.254.169.254, private ranges).

Fixed: `isSafeWebhookUrl` in `lib/insights.ts` requires https and rejects
loopback, RFC 1918, link-local, ULA/IPv6-local and `.local`/`.internal`
hosts; redirects are refused (`redirect: 'error'`). SerpAPI thumbnails were
already restricted to `https:`/`data:image/` and are only ever rendered in
`<img>` client-side, never fetched by the server; result links are now
additionally forced to `https://`.

Tests: `lib/__tests__/insights.test.ts`.

### 5. Medium: no security headers or CSP

Fixed in `next.config.ts`: a CSP (`default-src 'self'`, images from https
for expert thumbnails, `frame-ancestors 'none'`, `object-src 'none'`),
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` and HSTS on every response. `'unsafe-inline'` remains
for script/style because the Next.js runtime and styled-jsx need it; a
nonce-based CSP is a worthwhile follow-up.

Verified via `npm run build` and header inspection.

### 6. Low: email header injection (future-proofing)

No user-supplied address is ever used as a recipient today; the daily
report goes to `REPORT_EMAIL` from config. `sendEmail` (`lib/email.ts`)
still flattens CR/LF out of subjects, validates recipients with
`isValidEmail` (which rejects whitespace, so CR/LF cannot pass), and fails
closed. When intro emails are built later, they must go through the same
helper.

Tests: `lib/__tests__/email.test.ts`.

### 7. Low: PII handling

`leads` is the only table holding personal data, deliberately without a
foreign key so it can be exported or purged independently. Retention is
enforced by `purge_expired()` (second migration), run daily by the report
route: leads and sessions older than 12 months, counters after 2 months,
API events after 3 months. Consent is recorded on every lead row; the
consent action is the visitor submitting their email to request an intro.

## Verified safe (no change needed)

- **SQL injection**: no SQL is ever built from strings. All access goes
  through PostgREST with JSON bodies; table names and `on_conflict` params
  are constants; session ids must parse as UUIDs (`parseSessionId`).
- **XSS**: no `dangerouslySetInnerHTML` anywhere; React escapes all model
  and SerpAPI text; images restricted to `https:`/`data:image/`; no
  external links are rendered from search results.
- **Secrets in the client bundle**: no `NEXT_PUBLIC_` variables exist;
  `lib/supabase.ts` throws if it is ever imported into client code; a grep
  of `.next/static` after build finds no key names or values.
- **Raw stack traces**: `withMetrics` converts any uncaught route error
  into a generic 500 JSON body; existing catch blocks already returned
  clean messages.
