# Sourcing and enrichment: execution plan

Handoff document. A fresh session should be able to read this file plus
`CLAUDE.md` and continue without re-deriving any decision.

Branch: `sourcing-packs`. Not pushed, not merged.
Written 2026-08-04.

---

## Where this got to

Phases 1 to 3 are code complete. Verified locally with `npx tsc --noEmit`,
`npm test` (527 passing) and `npm run build`. **Not** verified against a live
search: there is no `.env.local` in this checkout, so no key was available to
run one.

| Phase | State | What landed |
|---|---|---|
| 1. Source packs + attribution | done, committed | `lib/sourcePacks.ts`, migration, `engine` on every result |
| 2. Exa as a second engine | done, committed | `lib/exa.ts`, `mergeResults`, both engines in parallel |
| 3. GitHub in the fast path | done | `lib/github.ts`, prompt exception, `code_verified` badge |
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
3. **Set `GITHUB_TOKEN`** in Vercel. Outstanding, and not blocking either.
   Issue it with no scopes: it reads nothing that is not already public and is
   there for the rate limit, 60 requests an hour unauthenticated against 5,000
   with a token. Absent, the lookup is skipped, no card shows "Code verified"
   and the ranking prompt gets no GitHub lines, which is exactly the behaviour
   before phase 3.
4. Phase 3 adds **no schema change**, deliberately, so gate 1 is still the only
   migration on this branch. `code_verified` is computed during a search and
   lives on that response only. Persisting it belongs in phase 4's enrichment
   migration rather than in a second schema change shipped on its own.

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

## Phase 3: GitHub in the fast path. Done.

**The hard constraint, unchanged: direct URLs only.** A `github.com` link
already in the results is reliable. Searching GitHub by a person's name is a
guess, and attaching a stranger's repos to a real named person is the worst bug
this product could ship. Name resolution still waits for phase 4, where there
is time to corroborate a handle against the person's own site.

What landed:

- `lib/github.ts`. `parseGithubLogin` reads the account out of a result link
  and refuses everything that only looks like one: another host, a lookalike
  host, plain http, and the thirty-odd reserved paths (`/orgs`, `/topics`,
  `/features`, `/sponsors`, `/trending` and so on) that a `site:github.com`
  query genuinely returns. `githubToken()` in `lib/env.ts` is read there, and
  every failure lands as "no badge" rather than as a failed search.
- **One round trip per candidate, met literally.** Only
  `/users/{login}/repos?sort=pushed&type=owner` is called, never
  `/users/{login}` as well. That endpoint's `owner` object carries the `type`
  field, which is what lets an organisation be dropped without a second
  request. Deduped by login, capped at 12 accounts, 2.5s timeout.
- Forks are excluded and an account with nothing of its own returns null. Both
  matter, because these figures are about to be labelled quotable to the model
  and a fork's stars are somebody else's.
- `RANK_SYSTEM` in `app/api/search/route.ts` carries the exception, placed
  directly after the rule it modifies so it reads as a carve-out rather than as
  a second opinion. It permits the four figures by name and re-forbids
  inferring an employer, a client, a project, a year or a seniority from them,
  and it says a result with no GitHub line is unmeasured rather than weaker.
- `code_verified` on `ExpertRecord` and `Expert`, set from the matched raw
  result and never from the model, exactly like `engine`. It renders in the
  meta row next to the rating rather than as a second pill beside "Top match".
  That badge is our opinion and is allowed to shout. This one is a checked
  fact, and it reads better stated quietly next to the other checked numbers.

### The one deviation from the plan as written

The plan said to run the lookups and the ranking call "inside one
`Promise.all`, then fold the GitHub data into the prompt". Those two cannot
both happen. The prompt is the ranking call's input, so a call already in
flight cannot receive data that arrives later.

Kept the prompt half, since the plan itself called it the bigger payoff, and
dropped the literal `Promise.all`. The lookups run concurrently with each other
and complete before ranking starts. Honest cost: up to 2.5 seconds added to a
search that already takes about twenty, not the zero the plan claimed. A slow
GitHub degrades to no badge rather than to a slow search.

### Not done, on purpose

- **No migration.** See deploy gate 4. `code_verified` is false on any set read
  back from Postgres, so the dashboard never shows a badge it cannot support.
  Fold the column into phase 4's enrichment migration.
- **No search route test.** The route change is three lines of wiring plus a
  prompt string, and this repo has no test for the search route to extend. The
  pure pieces are covered: 58 cases in `lib/__tests__/github.test.ts`, plus
  four in `experts.test.ts` including the payload assertion the plan asked for.
- **Not verified against a live GitHub API.** No `.env.local` and no token in
  this checkout, so every lookup test runs against a mocked `fetch`. The badge
  itself was verified end to end in the browser against a production build,
  with the demo profiles temporarily flagged, and that temporary edit reverted.
  `npm run dev` cannot be used for this: the CSP blocks `eval()`, which React
  needs in development, so nothing hydrates and no click lands. Use
  `npm run build` then `next start`.

## Phase 4: the enrichment pipeline

Triggered when a customer selects experts and asks for intros, not on sign in.
`quote_requests` already records which slots were picked.

- Migration: enrichment columns and a status on `match_profiles`.
- `lib/youcom.ts`: You.com Research API, standard tier ($50/1k). Deep tier
  ($100/1k) on the `top_match` only. 60 to 120s per call, so fan out in
  parallel and budget under 3 minutes total.
- `lib/enrich.ts`: per profile, fetch page text (Exa contents), GitHub with
  name resolution now permitted, then You.com Research. Phase 3 already has
  `parseGithubRepos` and `describeGithub`; what this phase adds is resolving a
  handle nobody linked to, which needs corroboration before it is trusted.
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
- The GitHub check only fires where a pack already asks for github.com, which
  is `ai` and `web`. A marketing or video brief will almost never carry a
  linked account, so those cards can never earn the badge. That is correct for
  now and it does mean the badge reads as an ai/web signal rather than a
  site-wide one. Worth watching whether a card without it starts looking worse
  by comparison in a category where nobody could have it.
- Nothing reads the attribution yet. After roughly 50 searches in a category,
  join `match_profiles.engine` to `quote_requests` to find which engine
  produced the people who were actually picked. That is the number that decides
  whether Exa stays.
