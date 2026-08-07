# Give the semantic engine a semantic query, and put a gate under retrieval

## Goal

A search finds people using what the visitor actually told us, and a retrieval
regression is caught by a test run rather than by a customer noticing.

## Constraints

- Every result stays attributable to the engine that found it, so the SerpAPI
  and Exa comparison the `engine` column exists to run is not broken.
- SerpAPI keeps short keyword queries. It is a Google wrapper, and long queries
  find articles rather than people. Only Exa's query changes.
- The visitor's `specifics` is untrusted text. Anything built from it is
  scrubbed and capped before it reaches an engine or a prompt.
- No change to `lib/prompts.ts`, the chat model, `sanitizeReply` or the question
  budget, so the existing chat eval gate does not apply to this work.
- A search must degrade rather than fail. Either engine missing, either query
  shape failing, still returns people.
- Files stay under 400 lines.

## Non-goals

- Not changing what the chat asks for. The rich data already exists in the
  brief; this is about using it.
- Not adding a third retrieval engine.
- Not touching the ranking prompt's anti-invention rules.
- Not building enrichment. That is phase 4 in SOURCING.md and unaffected.

## Tasks

- **T1: Build a semantic query from the brief.**
  - WHEN a brief reaches Exa, THE SYSTEM SHALL send a natural language query
    composed from `expert_type`, `specifics`, `domain` and `engagement` rather
    than the short keyword phrase SerpAPI receives.
  - WHEN the composed query is built, THE SYSTEM SHALL scrub it with
    `scrubUntrusted` and cap it at 400 characters before sending it.
  - GIVEN a brief whose `specifics` is empty, THE SYSTEM SHALL fall back to the
    existing keyword phrase so the query is never empty.
  - WHEN a pack query carried a `site:` prefix, THE SYSTEM SHALL still apply
    that host as `includeDomains` alongside the semantic query.
  - WHEN SerpAPI is called, THE SYSTEM SHALL send the unchanged short keyword
    query.

- **T2: Put a measured gate under retrieval.**
  - WHEN `npm run eval:search` runs, THE SYSTEM SHALL execute a fixed set of
    briefs spanning every pack and report per-probe source diversity.
  - IF any probe returns results from only one host, THE SYSTEM SHALL fail that
    probe, because single host domination is the failure that produced the
    Behance and Fiverr bugs.
  - IF any probe returns fewer than three people, THE SYSTEM SHALL fail that
    probe.
  - WHEN a probe completes, THE SYSTEM SHALL ask an LLM judge whether the
    returned people plausibly practise the trade in the brief, and fail the
    probe when the judge says no.
  - GIVEN no API keys are present, THE SYSTEM SHALL skip rather than fail, in
    the same way `evals/chat.eval.ts` already skips.

- **T3: Retire the dead LinkedIn source.**
  - GIVEN `site:linkedin.com/in` contributed zero results across six audited
    probes, THE SYSTEM SHALL stop issuing it in any pack that cannot show it
    contributing.
  - WHEN a pack loses its LinkedIn query, THE SYSTEM SHALL replace it with a
    host measured to contribute, or drop to the generic hosts alone.

- **T4: Read the logs that already exist.**
  - WHEN a search completes, THE SYSTEM SHALL record per-source raw counts
    where they can be queried later, not only in a console line.

## Tradeoffs

- What Exa receives as its query:
  - Composed in code from brief fields: deterministic, free, no added latency, but reads like assembled fields rather than a question.
  - Written by the chat model as an eighth brief field: reads naturally, free at search time, but changes `lib/prompts.ts` and triggers the 19 scenario chat eval.
  - A separate Haiku call at search time: best phrasing, but adds a model call inside the 20 second budget for a query nobody has proven is better yet.

- Where the retrieval eval runs:
  - Against production over HTTP, like `evals/prod-canary.eval.ts`: tests the real thing including keys and quotas, but spends a real search per run and needs keys.
  - Against the local route with mocked engines: free and fast, but proves only the plumbing, and every bug so far was in what the engines actually returned.

- How strictly the diversity check fails:
  - Fail on a single host: catches the exact bug that shipped twice.
  - Warn on a single host, fail on two consecutive runs: fewer false alarms when a niche trade genuinely lives on one marketplace.

## Risks and unknowns

- Does a long semantic query still return results once `includeDomains` is applied, or does the domain filter starve it?
- Unknown: whether a semantic query finds better people than the keyword phrase, since nobody has compared them on one brief.
- Does a 400 character Exa query cost materially more than a 4 word one?
- Unknown: which host replaces LinkedIn for the writing, marketing, professional and admin packs.
- Will an LLM judge on trade match be stable enough to gate on, or will it flap on borderline profiles?
- How many eval probes can the SerpAPI monthly cap of 250 actually carry per run?
- Should the eval run on every retrieval change, or nightly against production?

## Milestones

1. T1 shipped behind the existing degradation rules, with Exa results compared
   against SerpAPI results on the same brief and the comparison written down.
2. T2 running locally and green across every pack.
3. T3 decided from T2's data rather than from opinion.
4. T4, once there is a second reader for the counts.
