# Hands-On Assessment: Protocol, Rubric, Task Pack
*Working draft v0.1 — pilot on AI-native hires before any org-wide run*

## Protocol

- **Format:** 2-hour observed session. Screen recorded. Assessor present (silent) or reviews recording. One task from the pack below, matched to the person's role.
- **Instructions to participant:** "Use AI however you normally would. Any tool we license. You're scored on *how you work*, not just whether you finish."
- **What's scored:** workflow behaviors (rubric below). The output matters only as evidence that the workflow produced something real.
- **Cadence:** baseline wave after leadership sign-off, then quarterly. Levels are expected to move; a static score means the program is failing.
- **Explicit rule:** no self-assessment, no manager gut-rating. (Framework doc explains why — the METR perception gap.)

### Calibration first (weeks 1–2 of rollout)

1. AI-native hires take the assessment themselves, assessed by each other + you. This tests the *rubric*, not them: if the rubric can't distinguish them from a competent L2, fix the rubric.
2. Two assessors blind-score the same 3 recordings; discuss every dimension where they differ by ≥2 points; tighten the anchors.
3. AI-native hires then become the assessor pool for the org-wide wave.

## Scoring rubric (Builder track)

Score each dimension 0–5. **Level is set by gates, not averages** — averaging lets strong prompting mask absent verification.

| Dimension | 0–1 looks like | 3 looks like | 5 looks like |
|---|---|---|---|
| **Delegation instinct** | Reads code before asking AI anything; hand-writes what agents could do | Delegates whole subtasks by default; hand-writes only judgment calls | First move is decomposing the task into agent-runnable units |
| **Spec & prompt quality** | Vague one-line prompts, then fights the output | Gives context, constraints, acceptance criteria upfront | Writes a spec/plan first, iterates on the *plan* with the agent before any code exists |
| **Verification strategy** | Trusts output that "looks right"; runs it once | Has agent write tests, reads them, runs them | Builds independent checks the agent can't game: held-out cases, behavioral scenarios, demo scripts |
| **Context engineering** | Starts every session cold | Maintains/uses CLAUDE.md or rules files | Creates reusable skills; sets up mocks/fixtures so the agent can iterate safely |
| **Orchestration** | One chat, serial | Multiple sessions in parallel on independent subtasks | Long autonomous runs with checkpoints; parallel agents with a merge/verify plan |
| **Judgment** | Uses AI on everything or nothing | Recognizes tasks where AI is currently slower (cf. METR: familiar legacy code is exactly this zone) and adapts | Manages the cost/latency/quality tradeoff explicitly; can say precisely *why* this task is agent-shaped or not |

### Level gates (Builder)

- **L1:** delegates discrete tasks successfully during the session.
- **L2:** uses an agentic tool for whole components; reviews and correctly catches at least one agent error.
- **L3:** runs ≥2 parallel workstreams; hand-writes <10% of shipped lines; review is diff-level.
- **L4:** produces a written spec/plan before implementation; verification ≥4; ships part of the task without reading most of the generated code, and can defend why that was safe.
- **L5:** not assessable in a 2-hour session — evidenced by systems they've built (scenario pipelines, agent harnesses), assessed by portfolio review.

## Task pack (Builder) — matched to our actual work

Each task lives in a sandboxed repo with anonymized/synthetic data. Never client code.

**Task A — Legacy bug hunt.** A deliberately unfamiliar ~10k-line legacy codebase (pick a dated open-source app, or an anonymized clone of one of ours) with 3 seeded bugs of increasing subtlety, one of which is only visible via behavior, not code reading. Tests exist but are patchy. *Discriminates:* L2s read code manually; L3+ instrument the codebase with agents, generate characterization tests, and localize by behavior. This is also the METR danger zone — watch for people who'd be faster hands-on but grind through AI anyway (Judgment dimension).

**Task B — Integration build.** Build a sync between two systems given only API docs; one "external" API is a mock service we provide (respondents at L3+ often extend the mock themselves to test failure modes — score that under Verification). Includes a rate-limit and a pagination edge case in the mock. *Discriminates:* spec quality, whether they test against failure modes they can't see in the happy path.

**Task C — Data pipeline.** Messy CSV exports (synthetic) → cleaned, validated, loaded, plus a summary report. Seeded data-quality traps (duplicate keys, silent type coercion, a timezone bug). *Discriminates:* verification — do they have the agent prove correctness (row counts, invariants, reconciliation checks) or eyeball the output?

**Role variants:** QA takes Task B but their deliverable is the scenario suite + mock-hardening, not the sync code. Ops takes an incident-simulation variant of A (broken deploy, logs available). BAs/PMs take Task B but deliver the *spec*, which an assessor then feeds unmodified to an agent — the score is how far the agent gets.

## Anti-gaming and fairness notes

- Rotate seeded bugs/tasks each quarter; retire any task once its solutions circulate.
- Score the recording, not the vibe: every gate claim must point to a timestamp.
- Publish the rubric openly. Studying the rubric = learning the actual skills; that's the point.
- Level ≠ performance rating in year one. Say this loudly or people will sandbag/panic.

## Path to observability agents (phase 2, after baseline)

Once the baseline exists, corroborate (not replace) quarterly assessments with passive telemetry:

- % of merged commits agent-authored (committer metadata / tool dashboards)
- Tokens/day per person (Claude Code & Cursor admin dashboards) — a *leading* indicator of level, per StrongDM's spend heuristic
- Presence and freshness of CLAUDE.md / skills / spec files in repos
- Human-edit rate on agent output (small post-agent diffs at L2, near-zero hand edits at L4)
- Review latency and diff sizes (L3s review lots of diffs; L4s review plans and scenario results)

Telemetry measures *activity*; the session measures *skill*. Keep both, trust the session.
