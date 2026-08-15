# Upskilling Plan: 2–4 hrs/week, 12-week cycles
*Working draft v0.1*

## Operating model

- **Cohorts by assessed level**, not by team or seniority. Mixing an L1 and an L3 in the same exercises wastes both.
- **AI-native hires are coaches, not oracles.** Each runs a cohort and pairs weekly. Their calibration check: they take the same quarterly assessment as everyone, and they own the monthly framework challenge (things change weekly; their job is to keep the framework current, which also continuously tests whether *they're* still at the cutting edge — your exact worry).
- **Weekly cadence (fits 2–4 hrs):** 1 hr cohort session (technique + show-and-tell), 1–2 hrs deliberate practice *on real tickets* tagged as practice work, 30 min async: post one workflow win/failure to a shared channel.
- **Client-code constraints:** all practice on sandbox repos or anonymized clones. Standing infrastructure task for the L3+ cohort: build mock services ("digital twins") of the client systems we integrate with, per StrongDM's pattern — this is simultaneously practice, verification infrastructure, and a real asset for a services firm.

## Level-up paths

### L0/L1 → L2 (weeks 1–4 for most)
Goal: agentic tool in daily flow.
- Install + configure Claude Code/Cursor agent mode; complete 5 real tickets where the agent writes ≥80% of the code.
- Learn: giving context upfront, iterating on output, catching agent errors.
- Exit: assessment gate for L2.

### L2 → L3 (the crowded jump — most of the org)
Goal: stop being the typist; become the reviewer-orchestrator.
- Week 1: one ticket, **zero hand-written lines**. Painful on purpose.
- Week 2–3: two parallel agent sessions on independent subtasks; write your first CLAUDE.md for a repo you own.
- Week 4–6: diff-level review habits — review the agent's plan before it codes; batch-review diffs.
- Week 7+: build one reusable skill for a recurring team task.
- Exit: L3 gates (≥2 parallel streams, <10% hand-written, diff-level review).

### L3 → L4 (target for seniors + AI-native hires' own growth)
Goal: specs and verification replace code reading.
- Write a spec so complete an agent implements it with zero mid-flight clarification; iterate until true.
- Build one held-out verification: acceptance checks the implementing agent never sees.
- Run one 4+ hour autonomous session with checkpoints; ship the result reading <20% of the code, justified by the verification artifact.
- Exit: L4 gates.

### The five prompts (L2 → L4 accelerators)
One per week, used on real work, discussed in cohort. Each attacks a specific L2 habit:

1. **The plan-first prompt:** "Do not write any code. Read the codebase and write an implementation plan with file-level changes, risks, and the tests that would prove it works. I'll critique the plan." *(Breaks: coding before specifying.)*
2. **The self-verification prompt:** "Implement the plan. Then write and run a verification script that proves each acceptance criterion, and show me the evidence — not the code." *(Breaks: human-as-only-tester.)*
3. **The adversary prompt:** "Act as a hostile QA engineer. Find inputs and sequences that break what you just built. Then fix what you found and re-run." *(Breaks: trusting the happy path.)*
4. **The context prompt:** "Interview me about this repo's conventions, gotchas, and domain rules, then write a CLAUDE.md so a fresh agent session needs nothing from my head." *(Breaks: cold-start sessions; makes knowledge organizational.)*
5. **The delegation-audit prompt:** "Here's what I did by hand this week: [list]. For each item, tell me whether an agent could have done it, what setup/skill/mock would be required, and build the highest-value one." *(Breaks: invisible L2 residue — Shapiro's 'Why am I doing this?' koan, operationalized.)*

### QA / Ops / Spec tracks
Same cadence; exercises swap in scenario-writing (QA), agent-executed runbooks with approval gates (Ops), and executable-spec drills where the BA's spec is fed raw to an agent and scored on how far it gets (Spec). QA's capstone: own a held-out scenario library for one product area.

## Program metrics (quantitative, for leadership)

- **Level distribution** per quarter (the headline chart: % at L3+ moving up)
- **% of merged work agent-authored** (telemetry, doc 02)
- **Cycle time** on comparable ticket classes, before/after — the honest metric, since METR shows *felt* speed is unreliable
- **Verification assets created:** CLAUDE.md files, skills, scenario suites, mock services (count + usage)
- **Token spend per engineer** — report as an investment leading indicator, paired with cycle time so it's never read as waste

## Risks to state plainly in the proposal

- Expect a **temporary slowdown** during L2→L3 transitions (people are slower before they're faster; METR found exactly this zone). Budget for it; don't run it during a crunch.
- Legacy client systems are where AI assistance underperforms most — L3/L4 behaviors there depend on the mock/twin infrastructure existing first. Sequence accordingly.
- L5 is a lighthouse, not a Q3 objective. StrongDM's version costs ~$1k/day/engineer in tokens and was built greenfield by three very senior people.
