# Get An Expert

One-page site. A glass chat asks a visitor two or three short questions about
what they need, searches live expert profiles, and lets them request an intro
by email. Every interaction is captured as structured data.

Package name in `package.json` is still `midsesh`.

## Stack

- Next.js 16, App Router, TypeScript, React 19
- Vitest for unit tests (`npm test`)
- No database yet. Adding Supabase is Phase 1 in `WORKPLAN.md`.

## Layout

```
app/stuck/         /stuck: dev flow for people stuck in AI coding sessions
app/api/chat/      intake questions, calls Claude
app/api/search/    expert search, calls SerpAPI
app/api/intros/    intro request, sends email
app/api/report/    daily monitoring email, hit by Vercel cron (vercel.json)
components/        Chat, Thread, Composer, ExpertCards, IntroForm, GetUnstuck,
                   Sonar, TypingStatus, flows (per-flow copy + install targets)
lib/               anthropic, serp, email, validate, ratelimit, insights, demo,
                   supabase, sanitize, usage, metrics, report
lib/__tests__/     vitest specs
supabase/          plain SQL migrations in migrations/
design/mockup.html approved static mockup, 5 states, keys 1-5
SECURITY.md        Phase 2 security review: findings, fixes, tests
```

## Environment

Copy `.env.example` to `.env.local`. Every key is optional; the app degrades
instead of crashing.

- `ANTHROPIC_API_KEY` powers intake questions. Without it the chat runs a
  scripted demo flow from `lib/demo.ts`.
- `SERPAPI_KEY` powers live profile search. Without it `lib/demo.ts` returns
  three sample profiles.
- `INSIGHTS_WEBHOOK_URL` optional. Briefs and intro requests are POSTed here.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` persist sessions, messages,
  searches and leads. Without them nothing is stored. Server routes only;
  `lib/supabase.ts` must never be imported into a client component.

Never commit real keys. `.env.local` is gitignored.

## Conventions

- No em dashes in user-facing copy or prose. See the writing rules in the
  global config.
- Immutable updates. Return new objects instead of mutating.
- Files stay under 400 lines. Split when they grow.
- Validate at every API boundary. `lib/validate.ts` holds the schemas.
- Handle errors explicitly. The chat must never show a raw stack trace.

## Working on this repo

Run `npm install` then `npm run dev` (port 3000) or `npm test`.

Before opening a PR: `npm test` and `npm run build` both pass.

Read `WORKPLAN.md` for the current phases and pick up from there.
