# AI-Native Levels Framework
*Working draft v0.1 — for internal calibration before leadership proposal*

## Why this framework

Dan Shapiro's "Five Levels" (L0 spicy autocomplete → L5 dark factory) is the right backbone: it's memorable, zero-indexed like the NHTSA driving-automation levels it copies, and it's already the shared vocabulary in the industry (Simon Willison, HN, etc.). But used as-is, it has three gaps for our org:

1. **It only describes coders.** Our IT org includes QA, ops/support, and BAs. We add parallel role tracks.
2. **It has no behavioral anchors.** "You feel like a manager" isn't measurable. Every level below is defined by *observable behaviors* that an assessor can score in a hands-on session.
3. **It ignores org readiness.** An individual can't operate at L4 if the org gives them no sandbox, no token budget, and no spec culture. We track an org-readiness dimension separately so we don't blame people for organizational gaps.

We keep Shapiro's numbering so external content (blogs, talks, the "five levels" discourse) maps directly onto our internal language.

## The honest baseline (why self-assessment is banned)

METR's randomized controlled trial (16 experienced open-source devs, 246 real tasks, early-2025 tools) found developers were **19% slower** with AI — while believing they were 20% faster. Two caveats cut both ways: (a) the tools were early-2025 vintage and METR labels the result historical; (b) the perception gap is the durable finding. **People cannot self-report their level.** All level assignments come from observed assessment (see doc 02), never surveys.

Corollary: expect most of our team to believe they're L2–L3 and to measure at L1–L2. That's normal. The framework exists to fix it, not to rank people for punishment. Levels are **workflow maturity, not seniority** — a brilliant senior engineer can be L0 and a junior can be L4.

---

## Builder track (developers)

| Level | Name | Observable behaviors | The trap at this level |
|---|---|---|---|
| **L0** | Manual | AI used as search/autocomplete only. Every character human-approved. | Believing craftsmanship requires typing. |
| **L1** | Task delegation | Offloads discrete tasks: "write a unit test," "add a docstring," regex, boilerplate. Still typing-rate-bound. | Confusing "uses AI daily" with "AI-native." |
| **L2** | Pair programming | Uses an agentic tool (Claude Code/Cursor agent) in flow. Delegates whole functions/files. Reviews every line. Feels extremely productive. | **The L2 trap: it feels done.** ~90% of self-described "AI-native" devs live here. This is where METR found people who feel 20% faster and aren't. |
| **L3** | Agent manager | Runs multiple agent sessions in parallel. Writes little code by hand. Reviews diffs, not keystrokes. Maintains CLAUDE.md / project context files. | Drowning in review. Life becomes diffs; many people feel *worse* here and retreat to L2. |
| **L4** | Spec-driven | Writes specs and argues with the agent about the spec, not the code. Builds skills, plans, and verification harnesses. Kicks off long autonomous runs; checks whether tests/scenarios pass, samples diffs rather than reading all of them. | Weak verification. If your tests are agent-written and unaudited, you're trusting `assert true`. |
| **L5** | Software factory | Builds the *system* that builds software: spec + scenario pipelines, agents converge without human code review. Humans approve outcomes. (StrongDM pattern: scenarios held out from agents like a test holdout set; "satisfaction" measured probabilistically.) | Cost and applicability. StrongDM's heuristic is ~$1,000/day/engineer in tokens. L5 is a destination for greenfield internal tooling, not a Q3 target for client legacy systems. |

**Gate between L3 and L4** (the one that matters most for us): the person ships work where they *did not read most of the code*, and can show the verification artifact (test harness, scenario suite, demo script) that justified shipping it.

## QA track

QA is the role that *gains* the most value in this transition — L4/L5 quality is entirely a verification problem.

- **Q0** Manual test cases, manual execution.
- **Q1** AI drafts test cases; human curates and runs them.
- **Q2** Agent writes and runs test suites; human reviews coverage and results.
- **Q3** Designs behavioral **scenarios** (end-to-end user stories) separate from the codebase; agents execute them at volume against mocks/twins of external systems.
- **Q4** Owns the holdout scenario library and satisfaction metrics that gate what ships — the human check that keeps the factory honest. Builds digital-twin-style mocks of client/third-party systems so testing isn't rate-limited by production.

## Ops/support track

- **O0** Manual runbook execution.
- **O1** AI drafts runbooks, summarizes incidents, writes queries.
- **O2** Agent executes runbook steps with human approval per step.
- **O3** Agents handle routine incidents end-to-end; human handles escalations and audits samples.
- **O4** Designs the automation: triage policies, guardrails, escalation criteria. Reviews outcomes weekly, not tickets daily.

## Spec track (BAs, PMs, analysts)

- **S0** Writes documents for humans.
- **S1** AI drafts docs; human edits.
- **S2** Writes structured specs (markdown, acceptance criteria) that an agent can act on with light dev supervision.
- **S3** Specs are directly executable by the factory: precise enough that an L4 builder hands them to agents unmodified. Writes scenario definitions with QA.
- **S4** Owns the spec → software interface. This is the highest-leverage role in the end state: the newsletter's core claim — *specification is becoming the most valuable skill* — lands here.

## Manager track

- **M0** Manages humans writing code: sprints, standups, line-level code review culture.
- **M1** Team uses AI; manager tracks adoption but processes unchanged.
- **M2** Restructures process around agents: review-of-outcomes over review-of-code, token budget as a managed resource, removes coordination that exists only because humans used to write the code.
- **M3** Runs a small team whose output was previously a large team's. Org design, verification standards, and spend/outcome tradeoffs are the job.

## Org-readiness dimension (assessed once, for the org)

Individual levels are capped by these. Score each 0–3:

1. **Sandboxes** — can people run agents against realistic-but-safe copies of client systems? (Given our client-data constraints, this likely means anonymized fixtures and mock services — see the digital-twin approach in doc 03.)
2. **Tool access & spend** — agentic tool licenses for all, and a token budget that treats spend as a leading indicator, not a cost to minimize.
3. **Spec culture** — do specs, CLAUDE.md files, and skills live in repos and get maintained?
4. **Verification infrastructure** — CI, scenario suites, environments where "the tests pass" means something.
5. **Policy clarity** — written rules for what code/data agents may touch per client.

**Rule: don't push individuals more than one level above what org readiness supports.** If verification infra is 0, L4 behavior is reckless, not advanced.

---

## Framework governance

Things change weekly; the framework must too. The AI-native hires' first standing duty (doc 03) is a monthly **framework challenge**: what's now wrong, what levels need redefinition, what tooling assumptions expired. Version this doc; expect v1.0 only after they've torn v0.1 apart.
