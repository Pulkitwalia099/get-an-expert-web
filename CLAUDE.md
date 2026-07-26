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
app/api/presence/  which card to show and whether that person is on
app/api/call/      ring, status, answer, end
app/api/operator/  flip a presence switch, guarded by OPERATOR_SECRET
app/operator/      /operator?secret=…: both switches, ringtone, Answer
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

## Chat behavior is eval-gated

The chat is an LLM feature, so its failures are invisible to unit tests. The
system prompts live in `lib/prompts.ts`, and `evals/` holds 19 simulated
visitors with an LLM judge (see `evals/README.md`).

- Touch `lib/prompts.ts`, the model, `sanitizeReply`, or the question budget
  in `app/api/chat/route.ts`: run `npm run eval` and get every scenario green
  before opening the PR. The gate is a clean run, not a number, so adding a
  scenario never leaves this line stale.
- After any deploy that touches env vars or keys: run
  `EVAL_TARGET=https://midsesh.com npm run eval`. It fails if the live site
  is serving the scripted demo replies again.
- A visitor complaint about the chat starts with `npm run sessions` (last 10
  Supabase transcripts), and ends with a new scenario in
  `evals/scenarios.ts` that reproduces it.

## The call button

A "Talk to a human" pill in the chat titlebar, shown once the visitor has
sent one message. Tapping it asks `/api/presence` once, which matches the
brief to Pulkit or Rohit and reports whether that person is switched on. On
means a Daily audio room plus a Telegram ring; off means a prefilled Cal.com
picker in the same card.

The pill never shows presence. A control that permanently reads "nobody is
here" teaches people to stop looking, so the answer only appears on the card
after the tap. Nothing is polled.

Presence is manual: flip it at `/operator?secret=…` on any device. Every
toggle expires after four hours. The secret goes in an `x-operator-secret`
header and is stripped from the address bar on load.

The roster, the credential copy and the tag keywords live in
`lib/operators.ts`. Tag order inside each person is the priority order,
because the first keyword hit wins. Reordering that list changes routing.

A human answers this call. No copy anywhere may describe it as AI.

Nothing here touches `lib/prompts.ts`, the model, `sanitizeReply` or the
question budget, so the call button is outside the eval gate above. Do not
run `npm run eval` for call button changes.

## Working on this repo

Run `npm install` then `npm run dev` (port 3000) or `npm test`.

Before opening a PR: `npm test` and `npm run build` both pass.

Read `WORKPLAN.md` for the current phases and pick up from there.
