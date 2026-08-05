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
SOURCING.md        source packs, Exa, enrichment: state and remaining phases
```

## Environment

Copy `.env.example` to `.env.local`. Every key is optional; the app degrades
instead of crashing.

- `ANTHROPIC_API_KEY` powers intake questions. Without it the chat runs a
  scripted demo flow from `lib/demo.ts`.
- `SERPAPI_KEY` powers live profile search. Without it `lib/demo.ts` returns
  three sample profiles.
- `EXA_API_KEY` adds a second retrieval engine beside SerpAPI. Either key
  alone serves a search; both is the point, because every result is tagged
  with the engine that found it so the two can be compared on picks rather
  than on opinion. Exa also returns page text, which is why its results carry
  800 characters where a SerpAPI snippet carries about 160.
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

## Sign in and credits

Google sign in, written by hand in `lib/auth.ts` with no SDK. This repo has
six runtime dependencies and talks to Supabase over raw fetch, so adding
`@supabase/ssr` for a login button would have been the largest dependency
change in the project. The authorization code flow is a redirect, a POST and a
cookie, so it is spelled out instead.

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` turn it on. Without both, the
  Sign in control is not rendered and every auth route answers 503.
- `SESSION_SECRET` signs the session cookie, separate from the OAuth secret so
  rotating one does not invalidate the other. Changing it signs everyone out.
- The Google console must hold the callback URL exactly. Preview deploys get
  generated hostnames, so set `AUTH_ORIGIN` to pin them at the registered one.
- The ID token's signature is not verified, on purpose. It is fetched directly
  from Google's token endpoint over TLS with the client secret, which is the
  case OpenID Connect Core 3.1.3.7 exempts. `iss`, `aud`, `exp` and
  `email_verified` are all still checked.

Credits are an append-only ledger in `lib/credits.ts`. Balance is a sum over
`credit_entries`, never a stored column, so the number and its history cannot
disagree. Every amount is integer cents.

- The arithmetic is in `lib/credit-math.ts`, not `lib/credits.ts`. That second
  module is server-only and throws if it reaches a browser, and the setup cards
  need the same sums to tell a visitor what their credit would do to a price.
- `SIGNUP_CREDIT_CENTS` is granted once, made idempotent by a unique index on
  `(sub, ref)` rather than by a read-then-write that two requests could race.
- `MAX_CREDIT_SHARE` is 1: credit may cover a whole order. It was 0.5 while the
  launch price was on, because $50 against a setup listed at $11 bought four of
  them. With real prices back the cap is lifted deliberately, to make a first
  setup free and buy a first cohort to learn from.
- Two things bound that. Nothing is fulfilled automatically, since every setup
  is a live call somebody schedules and can decline, so a bogus free order
  costs a calendar slot rather than money. And setting `SIGNUP_CREDIT_CENTS` to
  0 stops new grants without touching anyone's existing balance.

Orders carry no payment. Nothing here touches Stripe, and the booking sheet's
"$0 to pay today, you pay once the setup is running" promise is unchanged.
`lib/orders.ts` is shared by two callers, and the Cal webhook is the honest
one: the browser cannot see a time being picked, so an order written when the
sheet opened would count everyone who only looked. Both paths key off a `ref`
behind a unique index, which is what makes a Cal redelivery a no-op.

## Gated matches and the dashboard

A search returns 3 to 8 people instead of 3, and a signed-out browser gets
their names, photos and profile links withheld. Pick who you want first, sign
in second: the wall is the last step, not the first.

The blur is not CSS. `/api/search` returns a payload with `name`, `photo` and
`link` set to null, so there is nothing in the DOM to reveal. `redactExpert`
in `lib/experts.ts` is the single place that decision is made, and
`lib/__tests__/experts.test.ts` asserts no withheld value survives into the
serialised response. `/api/matches/[set]` is the only route that hands a name
back, and it checks the session cookie and ownership first.

- `match_sets` and `match_profiles` hold the results. They exist because a
  dashboard cannot show you who you picked if the cards only ever lived in
  React state, and because `finalizeExperts` used to throw the link away.
- An unclaimed set is claimable by whoever holds its id, which is why the id
  is a uuid. Once `sub` is set it belongs to one account and a leaked id stops
  working. `claimMatchSet` patches with `sub=is.null` in the filter, so two
  requests racing to claim cannot both win.
- The selection has to survive the trip to Google. `/api/quotes/intent` signs
  it into a short-lived httpOnly cookie and the auth callback acts on it, so
  somebody lands back on `/dashboard` with the request already placed rather
  than being asked to choose again.
- `quote_requests.ref` is derived from the sorted slots, against a unique
  index on `(set_id, ref)`. A double tap, a retried fetch and a second pass
  through the callback all collapse to one request.

Each profile carries two text blocks and they must not be merged. `why` is
held to what the search snippet supports. `projected` renders under the
heading "Why this could fit" and is our read of the work, never a claim about
the person's history. The ranking prompt in `app/api/search/route.ts` forbids
inventing an employer, client, project, year or number, because these are real
named people and a visitor hires on what it says. `lib/demo.ts` is the one
place a biography may be invented, and only because nobody in it is real.

Google sign in is the main way through. An email address still works and still
gets the quotes, it just gets no dashboard. Turning away everyone without a
Google account is a strange way to run a marketplace, and it is the same trade
the site made before the gate.

The outbound agents in `midsesh-outbound` are what make the 24 hour promise
true. They poll `quote_requests` for `status='open'`. **Until that repo reads
this table, requests land and nothing works them.** `/api/operator/quotes`
moves a status by hand behind `OPERATOR_SECRET` for when it goes wrong.

Nothing here touches `lib/prompts.ts`, the model, `sanitizeReply` or the
question budget, so the eval gate does not apply to it. The ranking prompt is
a separate prompt in the search route and is not covered by `evals/`.

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

Sourcing and enrichment work has its own plan in `SOURCING.md`: what has
already shipped on the `sourcing-packs` branch, the decisions not to
relitigate, and phases 3 to 5 with enough detail to execute. Read it before
touching `lib/sourcePacks.ts`, `lib/exa.ts` or the search route.
