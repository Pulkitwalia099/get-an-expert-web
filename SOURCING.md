# Sourcing and enrichment: execution plan

Handoff document. A fresh session should be able to read this file plus
`CLAUDE.md` and continue without re-deriving any decision.

Branch: `sourcing-packs`. Two commits, not pushed, not merged.
Written 2026-08-04.

---

## Where this got to

Phases 1 and 2 are code complete and committed. Verified locally with
`npx tsc --noEmit`, `npm test` (465 passing) and `npm run build`. **Not**
verified against a live search: there is no `.env.local` in this checkout, so
no key was available to run one.

| Phase | State | What landed |
|---|---|---|
| 1. Source packs + attribution | done, committed | `lib/sourcePacks.ts`, migration, `engine` on every result |
| 2. Exa as a second engine | done, committed | `lib/exa.ts`, `mergeResults`, both engines in parallel |
| 3. GitHub in the fast path | not started | |
| 4. Enrichment pipeline | not started | |
| 5. Dashboard progress + email | not started | |

### Deploy gates

1. ~~Apply `supabase/migrations/20260804020000_source_attribution.sql`.~~
   **Applied 2026-08-04** to the midsesh project (`mzgkeorgtlazaskgnmea`).
   `match_sets.pack` and `match_profiles.engine` both confirmed present. This
   was the blocking one: without those columns the insert fails,
   `storeMatchSet` returns null, `locked` computes to false in
   `app/api/search/route.ts`, and anonymous visitors see the withheld names.
   Nothing to do here now, but do not deploy a further schema change to this
   branch without applying it first for the same reason.
2. **Set `EXA_API_KEY`** in Vercel. Still outstanding, and not blocking.
   Absent, the search runs on SerpAPI alone and behaves exactly as it did
   before this branch. The source packs work either way; only the second
   engine and its page text wait on this key.

---

## Decisions already made. Do not relitigate these.

- **Four packs only:** `marketing`, `ai`, `video`, `web`. Security, Data,
  Design and Admin fall through to the previous generic queries. New packs get
  added when demand shows up, as an entry in `TEMPLATES` in
  `lib/sourcePacks.ts`.
- **No geographic filter.** India was considered and dropped.
- **Contact finding is out of scope.** No Hunter, Findymail or Apollo.
- **No Batch API.** Half price but up to an hour, and the latency rule is
  minutes, not hours.
- **Enrichment runs on selection, not on sign in.** The expensive research runs
  only on the people a customer picks and says "connect with these" about,
  which is typically 2 to 3 rather than 12.
- **Budget:** $2 per search ceiling. Current model lands at $0.13 anonymous,
  about $0.31 when someone picks three, about $0.68 worst case.
- **Classification is keyword scoring, not an LLM call.** Same shape as
  `matchOperator` in `lib/operators.ts`. Zero latency, zero cost, fails to null
  rather than guessing.

---

## Conventions this branch has followed

- **TDD, strictly.** Every test written first and watched fail for the right
  reason before implementation. Three real bugs were caught this way; see the
  commit messages on `a6a45cd` and `559f4a5`.
- **Gates:** `npm test` and `npm run build` must both pass. Also run
  `npx tsc --noEmit`, which catches things the Next build does not because it
  type-checks test files too. Ignore the 8 pre-existing
  `lib/__tests__/operators.test.ts` "possibly null" errors; they predate this
  work.
- **The eval gate does not apply.** Nothing here touches `lib/prompts.ts`, the
  chat model, `sanitizeReply` or the question budget. The ranking prompt lives
  in `app/api/search/route.ts` and `CLAUDE.md` explicitly puts it outside
  `evals/`. Do not run `npm run eval` for this work.
- **No em dashes** anywhere, including commit messages and code comments.
- Commit messages are imperative and describe the effect, not the mechanism.
  Look at `git log` for the house style.

---

## Phase 3: GitHub in the fast path

**Why it is cheap.** The 20 second search budget is dominated by the Sonnet
ranking call. GitHub lookups do not depend on ranking, they depend on the raw
candidate list, which exists before ranking starts. Fire both at once: ranking
takes about 15s, GitHub finishes in about 2s, wall clock is unchanged.

**The payoff is bigger than a badge.** Because the data is ready before ranking
finishes, it goes into the ranking prompt. For an ai or web brief, Sonnet ranks
on languages, stars and commit recency instead of a snippet.

**The hard constraint: direct URLs only.** A `github.com` link already in the
results is reliable. Searching GitHub by a person's name is a guess, and
attaching a stranger's repos to a real named person is the worst bug this
product could ship. Name resolution waits for phase 4, where there is time to
corroborate a handle against the person's own site.

Build:

- `lib/github.ts`. Unauthenticated REST is 60 requests/hour per IP, which is
  too low; use a token via a new `githubToken()` in `lib/env.ts` for 5,000/hour.
  Degrade to skipping enrichment when absent, never fail the search.
- Parse `github.com/<user>` out of result links. Fetch the user and their
  repos. Keep it to one round trip per candidate.
- In `app/api/search/route.ts`, run the lookups and the ranking call inside one
  `Promise.all`, then fold the GitHub data into the prompt.
- Extend `RANK_SYSTEM` to say GitHub figures are verified data it may state
  directly, unlike snippet text. This is the one place the anti-invention rule
  gets a documented exception, so word it tightly.
- Badge on locked cards: "Code verified", never a number. A count would let
  someone search the numbers and identify a withheld person, which defeats
  `redactExpert`. Add a case to `lib/__tests__/experts.test.ts` asserting no
  count reaches the payload.

## Phase 4: the enrichment pipeline

Triggered when a customer selects experts and asks for intros, not on sign in.
`quote_requests` already records which slots were picked.

- Migration: enrichment columns and a status on `match_profiles`.
- `lib/youcom.ts`: You.com Research API, standard tier ($50/1k). Deep tier
  ($100/1k) on the `top_match` only. 60 to 120s per call, so fan out in
  parallel and budget under 3 minutes total.
- `lib/enrich.ts`: per profile, fetch page text (Exa contents), GitHub with
  name resolution now permitted, then You.com Research.
- **The Haiku 4.5 pass is the guardrail, not a summarizer.** It emits claim
  plus source URL and drops anything it cannot attribute, before Sonnet sees
  it. A research agent returns generated prose about a real named person,
  which is exactly what the ranking prompt's first rule exists to stop. Do not
  weaken this.
- Sonnet 5 rewrites `why` and `projected` with a source per sentence.
- Store the raw research output alongside the rewritten card, so a wrong card
  can be diagnosed as bad research or a bad write-up. Those are different bugs.

## Phase 5: dashboard progress and the email

Per-card enrichment state, an honest time estimate rather than a fake progress
bar, and a completion email to the Google account address. This is what makes a
three minute wait acceptable instead of confusing.

---

## Open

- `mergeResults` prefers the longer snippet, which in practice means Exa's page
  text. Worth revisiting once there is data on whether Exa's text actually
  ranks better than a Google snippet.
- The `live` gate in `app/api/search/route.ts` still applies the SerpAPI
  monthly cap even when only Exa is configured, so an exhausted SerpAPI quota
  drops the whole search to demo rather than letting Exa carry it. Deliberate,
  and commented at the call site. Revisit if the cap is ever actually hit.
- Nothing reads the attribution yet. After roughly 50 searches in a category,
  join `match_profiles.engine` to `quote_requests` to find which engine
  produced the people who were actually picked. That is the number that decides
  whether Exa stays.
