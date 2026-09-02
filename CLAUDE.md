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
app/operator/orders/[id]/  one round of changes: cut, ticks, faces, preview, send
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
- `GITHUB_TOKEN` checks the public repos behind any `github.com` link already
  in the results. It is the one fact on a card that is not self-reported, so
  the ranking prompt is allowed to state those figures directly. Issue it with
  no scopes; it is there for the rate limit, not for access. Without it the
  lookup is skipped and nothing else changes.
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

## One design language, and it is already written down

Every surface follows midsesh.com. The tokens at the top of `app/globals.css`
are the whole system: the sand ground, the warm ink ramp, terracotta, the
hairline `--line`, `--radius-card`, `--ease-out`. New work composes from those
and adds nothing to them. This covers the operator tools and one off prototypes
as much as the marketing pages, because a visitor who moves between them should
not be able to tell they were built at different times.

- **No accent rail down the side of a card.** A coloured left border on a
  rounded panel is decoration standing in for hierarchy, and it is the tell of
  a page that was not built here. Pulkit called it out on 15 Aug and the rule
  is absolute. Hierarchy comes from the uppercase micro label plus plain text
  that `.ord-brief-block` already uses, at 11px, 650 weight, `.14em` tracking,
  in `--ink-3`.
- The 2px neutral rails on `.ord-draft-talk`, `.opq-comments` and `.opq-trail`
  are a different device and stay. They mark a thread of list items, they are
  `--line-2` rather than accent, and they are not what the rule is about.
- Terracotta is for one thing per view. A category label, or a live control, or
  a link. Painting it onto borders, backgrounds and text in the same block is
  how the accent stops meaning anything.

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

## Retrieval is eval-gated too

Same reasoning, different failure. Search cannot be unit tested against what
the engines actually return, and every retrieval bug so far was found by a
person reading bad output: a UGC brief answered with seven Behance portfolios,
one host quietly producing every person in a set twice over, an ai brief tying
with web and falling through to generic, and a named stack scoring nothing.

`evals/search.eval.ts` runs one probe per pack against the deployed site.

```
EVAL_TARGET=https://midsesh.com npm run eval
```

- Run it after touching `lib/packs.ts`, `lib/sourcePacks.ts`, `lib/serp.ts` or
  `lib/exa.ts`. Without `EVAL_TARGET` it skips, so `npm test` is unaffected.
- It asserts at least 3 people and **at least 2 distinct hosts** per probe. The
  host check is the important one: a single host producing a whole set looks
  completely normal in the response and shipped twice.
- The trade-match judge needs an Anthropic key and skips without one, so the
  structural half still runs on a machine that has none. Production stores its
  key as a Vercel "sensitive" variable, which `vercel env pull` cannot read
  back, so a pulled `.env.local` will 401. Use your own key.
- Each probe spends 4 to 6 SerpAPI queries, so a full run is about 30 against a
  monthly cap that defaults to 250.

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

That prompt has exactly one exception, and `lib/github.ts` is it. A result that
already links to a `github.com` account gets its public repos read, and the
repo count, stars, languages and push recency go into the prompt as figures
Sonnet may state directly. Three rules hold it in place. Only a link already in
the results is used, never a search by name, because attaching a stranger's
repos to a real named person is the worst bug this could ship. An account whose
owner is an organisation is dropped, for the same reason. And what reaches a
browser is the boolean `code_verified` and nothing else: a star count or a
handle on a locked card is a search term that would undo `redactExpert`, which
is what `lib/__tests__/experts.test.ts` asserts. Nothing is persisted, so a set
read back from Postgres never claims the badge.

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

## One file in, both out

The operator drops the finished cut and the server draws the mark on a copy of
it. `lib/watermark.ts` shells out to ffmpeg from `@ffmpeg-installer/ffmpeg`,
`app/api/operator/watermark/route.ts` is the one caller, and
`assets/watermark.png` is the mark: a white plate reading "midsesh SAMPLE" at
half the frame width, 3.7% of the width in from the right and 13.5% of the
height up from the bottom.

- That is the **second** mark. The first was a small dark corner badge and it
  was invisible in motion on dark footage: Pulkit said "there is no watermark"
  twice while still frames proved it was there. Being able to prove the pixels
  exist is the least useful fact available.
- The vertical inset is a proportion of the height, not the width, which is the
  one asymmetry. It lifts the mark clear of the HTML5 control bar and of a
  burned in caption, both of which sit at the bottom whatever the frame shape.
- The rest are ratios of the width, so a 9:16 phone cut and a 16:9 landscape
  cut carry the same weight. `markGeometry` turns them into pixels in TypeScript
  rather than in the filter graph, because `scale2ref` means different things
  on different ffmpeg builds: `main_w` resolves to the reference width on
  ffmpeg 4 and to the overlay's own width on ffmpeg 8, so the same filter
  string draws a 269px mark on one and a 42px mark on the other.
- A function is killed at 300 seconds. `lib/watermark-guard.ts` holds the
  budget in **seconds of 1080p**, not seconds, because two minutes of 4K is
  four times the work and a clock-only check accepts it and then dies. Measured
  on preview: 77 seconds of 1080p took 117 seconds end to end.
- The dashboard checks the same guard before uploading, from `videoShape` in
  `components/OperatorDrop.tsx`. That check is the courtesy; ffprobe on the
  server is the rule. Over the guard, the two file flow comes back with the
  reason on screen.
- `isParkedFinalUrl` is the only thing between an operator session and an
  arbitrary fetch. ffmpeg opens what it is handed, so the URL must be https, on
  our own storage, under that order's own `final/` prefix.
- Both binaries are in `serverExternalPackages` and named in
  `outputFileTracingIncludes`. They resolve their binary with a runtime
  `require`, which fails the build if bundled and deploys without the binary if
  merely traced.
- `WATERMARK_LIVE=1 npx vitest run lib/__tests__/watermark.live.test.ts` runs a
  real encode. It is off in `npm test` because it spends a minute.

## LinkedIn delivers words, not a file

An order on the `linkedin` service hands over a post. `deliveryFor` in
`lib/delivery.ts` reads that off `service_slug`, and both order pages branch on
it. Nothing about the status ladder changes: a draft still goes out as
`sample_sent` and still ends at `delivered`.

- `mk_order_drafts` and `mk_order_comments` are append only, added by
  `migrations/0003_linkedin_drafts.sql` in the orders repo, which owns every
  `mk_` table. The newest draft row is the current one.
- The customer can edit the draft and comment on it, at
  `/api/marketplace/[id]/draft`. An edit writes a version with
  `actor='customer:<address>'` and **does not** spend a revision: somebody
  fixing their own job title should not use up the rewrite they paid for.
- A comment is a third thing, neither a version nor a status change. Filed as a
  version it would replace the text; filed as a `working` event it would bounce
  the order back into the queue.
- `advance()` asks for a file only when the service delivers one. Before this
  it always did, so a LinkedIn order could not reach `sample_sent` at all.

## The cockpit

`/operator/orders` is grouped by whose turn it is, not by when a row arrived.
Four tiles count Late, Your turn, On them and Quotes, and each one is a filter
rather than a label. `lib/promise-clock.ts` turns an age into a promise against
24 hours and `lib/operator-lanes.ts` sorts everything into lanes; the page is
markup over those two.

- The clock starts at `created_at` while an order is ours, and at `status_at`
  once a sample has gone out. `status_at` alone would restart the clock every
  time we touched the row, so an order could be worked on forever and never
  look late.
- **Lateness is decided once, by the lane.** `board()` settles the promise
  against the lane it picked, so a row sitting with the customer carries no
  clock at all. Before that, `promote` kept a quiet customer out of Late while
  `promiseFor` still returned a red "3d late", and the Waiting on them section
  painted a warning the Late tile did not count and tapping Late did not show.
  Two answers to one question is worse than either.
- The tiles are four questions, not four buckets, so Quotes deliberately double
  counts with Late. What it must never do is count a row the tile will not
  open, which is why it counts live requests rather than all of them.
- Quote requests are in this tool for the first time. Seven of them sat open
  from 4 August with nothing on the dashboard mentioning them, because the
  queue only ever read `mk_orders`. Showing them is not working them: that is
  still `midsesh-outbound`, and the status select on each row is the manual
  path through `/api/operator/quotes`.
- Closed is collapsed, newest first, and loses its age. An archive that reads
  like a queue is what that section exists to stop.

## A second round is its own screen

An order page used to replace the cut with the newer one, so a client coming
back a week later could not tell that version two answered anything. It now
keeps both on screen with their own notes between them: version one, what we
changed, version two, read left to right. `components/RevisionTrail.tsx`.

**No table was added for it.** `mk_order_events` already carries the file on a
`sample_sent` row and the customer's words on the `working` row that follows,
so `lib/orderRevisions.ts` walks the trail rather than recording it a second
way. `mk_order_assets` stays exactly what it was, the newest sample, which is
the right answer for the player that carries the buttons and the exact reason
version one used to vanish.

Two counting rules hold it up and both were bugs first.

- **Versions count distinct files, not rows.** Two cuts up for review write one
  row each and the customer's choice writes a third carrying the file they
  picked. Counting rows numbered the cut somebody chose as version two before
  anybody had changed anything.
- **Only a `working` row whose actor names a customer opens a round.** Our own
  moves back into the queue write the same status, and counting them showed
  people a round of feedback they never gave.

On a finished round the trail replaces `SampleReview` rather than sitting under
it, because both cuts are already in the trail and the standalone player was
the same file twice on one page. The buttons fall through to `OrderActions`,
the path a LinkedIn order already takes. **That trades away pinning a note to a
shot**, which `SampleReview` owns. It is worth it on a round where the thing
under review is a change somebody described in words, and it is the first thing
to revisit if a client asks for frame-level notes on a recut.

## What we changed, and who writes it

`order_changes` is our line on each thing they asked for, keyed to the version
that answered it. **Written by hand, never parsed from their note.** Turning
three paragraphs of feedback into three ticks is an editorial act, and a parser
guessing at it would tick things nobody did.

`done` is a column because the honest answer is sometimes no. A round where two
of three landed says so with the reason underneath, and a list that can only
tick is one a client stops believing the first time it is wrong.

Their exact words are never replaced, only folded. `Read full feedback` opens
their note verbatim; `View the transcript` under each player opens that cut's
shot list. Those two labels were each other's for a day, which is the kind of
mistake that sends somebody looking for one thing and hands them the other.

`order_avatars` is the lineup: the faces generated for a brand and the one that
got the job. A row is a face **actually generated while making this brand's
work**. Inventing one afterwards to pad the lineup would turn "here is what we
evaluated" into a false claim to somebody paying us, which is the same line
`lib/demo.ts` draws around invented biographies. `note` on a row holds the
reasoning behind a pick and is deliberately not rendered: the section is
thumbnails and one line, because a row of cards carrying a paragraph each
turned a footnote into a second article.

Both tables are `order_*`, not `mk_*`. The orders repo owns every `mk_` table;
these are written and read here.

## Rohit's side of a round

`/operator/orders/[id]`. The cut, the ticks, the faces, a link that opens the
customer's own page, then Send. Guarded by the operator cookie on the server
and 404s a stranger, rather than carrying a second copy of the queue's lock.

**Saving and sending are different buttons on purpose.** The only way to
preview a recut before was to upload it from the queue, which emailed in the
same press, so seeing what the client would see meant having already told them
to look. `/api/operator/round` writes only what the page renders and emails
nobody; `/api/operator/orders` is still the one thing that moves a status.

Both lists are replaced, not appended. They are what the page shows now rather
than a history of what it once showed, and an operator fixing a typo in one of
three ticks expects three ticks afterwards.

The upload puts the clean file under `final/` and the server draws the mark on
a copy, so approving has something to hand over the moment the sample goes out.
That is why `showDownload` accepts `approved` as well as `delivered`: waiting
for a second status made "Approve and download" a button that approved and then
asked somebody to come back.

## The copy on a second round is not the copy on a first

Three places said the wrong thing to somebody on their second version, and all
three were the first-cut line arriving again.

- **The rail.** `choiceStepFor` mapped `working` to step 0 whatever else was
  true, so an order where somebody had watched two cuts, picked one and written
  three paragraphs rendered "Two cuts ready, you are here". Picking cannot be
  undone, so it holds at the review step while we recut.
- **The headline.** `working` reads "In progress. Being made now. Your sample
  lands within 24 hours", which is for somebody waiting on a first cut.
  `REVISION_LABELS` and `REVISION_NOTES` replace it with two flat lines. Whose
  turn it is was the old copy's whole job and it is the wrong question on a
  screen that exists to show somebody their own notes answered.
- **The email.** `sample_sent` sent "one round of changes is included" about the
  round they had just spent. `advance()` asks `hasOpenRound` **before** it
  writes the event, because writing it is what closes the round. The recut mail
  carries no count of rounds at all: that is our bookkeeping and it reads as a
  limit being enforced.

The buttons under a recut are Approve and Reject, and `OrderActions` takes a
`final` prop rather than being rewritten. On a first cut Request changes stays,
because that round is what the price includes and what somebody is about to
spend. On the cut that answered those changes there is no further round to
offer, so nothing on screen promises one.

## One account, and settings that do something

`/account` holds orders and quote requests in one list with the credit balance.
`/orders`, `/orders/[id]` and `/dashboard` keep their URLs because every status
email links straight at them, so those became views of the same thing rather
than being replaced.

Four settings, and no notification preference: every email this product sends
is transactional, so a switch that turns them off breaks the order it belongs
to. That preference arrives when marketing email does.

- `accounts.session_version` is what "sign out everywhere" moves, added by
  `migrations/20260815000000_account_settings.sql`. A cookie carrying no
  version is accepted, which is what makes deploying it sign nobody out, and
  an unreadable version is accepted too, because the alternative signs out the
  whole site during a Supabase blip. Revocation is best effort and bounded by
  `SESSION_MAX_AGE`.
- `currentAccount` is the async replacement for `readSession` at every call
  site that can afford a round trip. `/api/search` was the one exception and it
  was wrong: `locked` is computed from that value, so a revoked session came
  back with every expert name unredacted.
- `accounts.name_locked` exists because `ensureAccount` upserts on every sign
  in, so Google would quietly overwrite an edited name a week later.
- **Erasing keeps the orders.** The account, its credit ledger and its match
  sets go; `mk_orders` rows survive with the address replaced by a marker,
  because they are the record of work delivered. Decided by Pulkit on 15 Aug.
  A known limitation is written where it happens: once the row is gone,
  `sessionVersionFor` cannot tell "no such account" from "Supabase did not
  answer", so other sessions survive until the cookie ages out.

## Every screen says where you came from

A standing rule from 15 Aug, not a feature. On any page a person can name the
way back without touching browser chrome.

`/signin` had no link, no back control and no mark. It has one now, and it goes
to `/` whatever `?next=` says, because that is the only destination on the
allowlist that shows a signed out visitor real content: `/dashboard` redirects
back to `/signin`, and `/orders` renders `SignInDoors`, so a derived
destination made the way out of signing in another sign in. `lib/signinBack.ts`
holds the constant and the reasoning, and the bar for adding a real branch back
is a page that renders content without a session.

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
