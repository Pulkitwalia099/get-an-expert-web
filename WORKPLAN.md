# Work plan

Four phases, in order. Each one is sized to be a single agent session. From a
phone, say "start Phase 1" and the agent should read this file and go.

Status: Phases 1 to 3 code complete. Still manual: apply both migrations in
`supabase/migrations/` to the Supabase project, and set the env vars from
`.env.example` in Vercel. Findings and fixes from Phase 2 are in
`SECURITY.md`. Phase 4 (deploy) not started.

---

## Phase 1: Supabase persistence

Save every interaction, including the ones people abandon halfway.

**Tables**

- `sessions` — one row per visitor session. Anonymous id, user agent, referrer,
  first seen, last seen, whether the flow completed.
- `messages` — every chat turn, linked to a session. Role, text, timestamp,
  which question number it answered.
- `searches` — each expert search. The brief, the query sent to SerpAPI, how
  many results came back, latency, whether it fell back to demo data.
- `leads` — separate table, one row per email captured. Email, the session it
  came from, which expert they asked about, consent flag, timestamp.

**Rules**

- Write the session row on the first message, not at the end. A visitor who
  types one line and leaves must still produce a row.
- Writes are fire and forget. A Supabase outage must never break the chat.
- `leads` is the only table holding personal data. Keep it separate from
  `sessions` so it can be exported and deleted on its own.
- Row Level Security on, with no policies granting the publishable key any
  read or write access. All writes happen in server routes using the secret
  key, which bypasses RLS.
- The Supabase client must never be imported into a client component. Keep it
  in a server-only module.
- Migrations live in `supabase/migrations/` as plain SQL.

**Env**

`SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the `sb_secret_...` key, not the
`sb_publishable_...` one). Add both to `.env.example` with empty values and to
the Vercel project.

Project URL is `https://qlivmjodlhywjwywwsbc.supabase.co`.

---

## Phase 2: Security hardening

Run by a dedicated agent. The search feature takes free text from strangers
and feeds it to two paid APIs, so assume it will be attacked.

**Must cover**

- SQL injection into Supabase. Parameterised queries only, no string-built SQL.
- XSS in chat output and expert cards. Nothing from SerpAPI or Claude renders
  as HTML. No `dangerouslySetInnerHTML`.
- Prompt injection. Treat visitor text as data, never as instructions to Claude.
  Strip or neutralise attempts to override the system prompt.
- API key abuse. Someone will script the `/api/chat` and `/api/search`
  endpoints to burn the Anthropic and SerpAPI quota. Needs per-IP rate limits
  that survive serverless cold starts, a daily global spend cap, and bot
  checks. `lib/ratelimit.ts` is in-memory today, which is not enough.
- SSRF via `INSIGHTS_WEBHOOK_URL` and any URL fetched from search results.
- Email header injection and open relay in the intro flow.
- Secrets. Confirm no key reaches the client bundle. Check for `NEXT_PUBLIC_`
  leaks.
- Security headers and a CSP.
- PII. Emails at rest, retention period, deletion path.

**Output**

Findings ranked by severity, then the fixes applied, then tests that prove
each fix. Do not just write a report.

---

## Phase 3: Monitoring and daily email report

Run by a dedicated agent.

**Watch for**

- SerpAPI quota. The free plan is 250 searches a month. Warn at 70% and 90%,
  and make the app degrade to demo results instead of erroring at 100%.
- Anthropic API errors, rate limits, and spend.
- Supabase write failures and connection errors.
- 5xx rate and p95 latency on all three API routes.
- Zero-traffic days, which usually mean the site is broken rather than quiet.

**Daily email**

One message a day to the owner. Yesterday's numbers, anything that crossed a
threshold, and a plain "no issues" when there were none. Send it even on quiet
days so silence is never ambiguous.

Use a Vercel cron job hitting a protected route. Protect it with a shared
secret, not just obscurity.

---

## Phase 4: Deploy to Vercel

Run by a dedicated agent, after Phases 1 to 3 are merged.

- Link the repo, set every env var for preview and production.
- Confirm the build passes and the site works with real keys.
- Point the cron job at production.
- Smoke test the full flow: chat, search, intro email, and a row landing in
  each Supabase table.
