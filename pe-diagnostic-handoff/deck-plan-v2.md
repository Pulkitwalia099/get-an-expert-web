# Deck plan v2 - PE Capability Diagnostic (rev 4 - MBB titles, tangible levels)

10 slides. Titles are full declarative sentences carrying one clear message each - MBB style. No "X, not Y" contrast constructions. Body supports the title only. Non-technical reader.
Design: forest cover + close, cream content. Cormorant Garamond display / Hanken Grotesk body. Spaced hyphens. Sentence case. No orange.

---

## S1 - Cover (forest)

**Headline:** "Your portfolio bought AI. The P&L can't see it."
**Sub:** "A capability diagnostic for the engineering teams inside your portcos - who can actually use AI, what's blocking them, what to fix first."
**Cred line:** "From the team that screens forward-deployed engineers for frontier AI labs and 3 vertical AI companies."
**Byline:** Pulkit Walia · Rohit Jain · laoh.ai · San Francisco
*(Client names moved off the cover; specifics live on S9.)*

## S2 - Why now (cream)

**Title:** "AI impact has moved from story to diligence requirement."
**Message:** buyers now pay for measured impact; unproven AI claims get discounted at exit.
**Visual:** timeline 2023 → 2026: "copilot licenses roll out" → "pilots everywhere" → "'AI-native' hires" → "buyers ask for measured impact in diligence" (PwC, 2026 deals). 2026 node visually heavy. Bottom strip: "Vista built an in-house Agentic AI Factory; mega-funds hire AI operating partners (Korn Ferry). Mid-market firms rent the playbook." Cite: BCG 2026 - most portfolios remain at Deploy: licenses out, operating model unchanged.

## S3 - The levels (cream)

**Title:** "Engineering teams sit at six distinct levels of AI capability."
**Message:** the levels are defined by observable daily workflows - anyone can be placed on the ladder by watching how they work.
**Visual:** ascending staircase L0 → L5. Each step: name + the tangible workflow that defines it (plain language, non-technical reader):

- **L0 - manual:** types every line themselves; AI is a search box.
- **L1 - task delegation:** asks AI for small pieces - a test, a snippet - and pastes them in by hand.
- **L2 - pair programming:** an AI agent writes whole files; the person still reads and corrects every line before anything ships. Feels very fast.
- **L3 - agent manager:** runs 2-3 agents at once on separate tasks in parallel copies of the codebase; reviews each agent's change summary instead of writing code; maintains a written project brief so agents start with full context.
- **L4 - spec-driven:** writes the full spec before any code exists - what to build, what "correct" means, the tests that prove it; agents then build for hours unsupervised; the person ships on passing evidence, sampling the code rather than reading it.
- **L5 - software factory:** builds the system that builds software - spec pipelines, agent fleets, and a held-out test library the agents never see, so they can't game the checks. No human reads the code; humans approve outcomes.

Callout on L2 (density marker): "the trap - it feels like mastery, and most self-described AI-native engineers are here." Cite: Dan Shapiro, The Five Levels, 2026.
Footer line: "Every level is claimed in interviews. Each one is verifiable only by watching the work - which is the diagnostic."

## S4 - Why the top levels pay (cream)

**Title:** "A team at L4 ships several times the output of the same team at L2."
**Message:** the levels are an economic ladder - for a non-technical reader, here is what goes in and what comes out at each stage.
**Visual:** input → what happens → output rows, three stages:

| | What goes in | What happens | What comes out |
|---|---|---|---|
| **L2** | one task per person | person and AI write together; every line human-read | one feature at a time; output scales only with headcount |
| **L3** | three tasks per person | three agents build in parallel; person reviews change summaries | several workstreams move at once; throughput per head multiplies |
| **L4** | a written spec with tests defined upfront | agents build unsupervised for hours; an independent test suite verifies | shipped software, proven by passing tests; cycle time collapses |

Proof chip: "L5 runs in production today - StrongDM's software factory turns specs into verified software with no human reading code, at ~$1k/day/engineer in tokens. A lighthouse for where this goes."
Bottom line: "Capacity per head and cycle time are the lines a value-creation plan is priced on."

## S5 - The measurement problem (cream)

**Title:** "Developers misjudge their own AI productivity by about 40 points."
**Message:** self-reported adoption data cannot locate anyone on the ladder.
**Visual:** paired giant numerals: "+20%" (sage) - how much faster developers believed AI made them · "-19%" (ink) - how much slower they actually were. Randomized trial, 246 real tasks (METR, 2025). Closing line: "Every adoption survey in your portfolio carries this same gap. Placing people on the ladder requires watching them work."

## S6 - How we measure (cream)

**Title:** "We measure capability by observing days of real work."
**Message:** observability agents capture how work actually happens; a live simulation calibrates the read.
**Visual:** three-step flow:
1. "Observability agents go onto laptops and repos" - announced and approved, a few days, zero engineer hours lost
2. "They record how work happens" - which tasks go to agents, how much agent output gets hand-corrected, whether specs and project briefs exist, how results get verified
3. "We score each person against the level definitions" - level plus the observed evidence behind it
Side chip (forest): "A role-matched live simulation calibrates every score - the same instrument we use to screen forward-deployed engineers for frontier labs."
Trust strip: "Workflow signals only - code never leaves the portco's environment · reports go to the person and the CEO · one 30-min security review with the portco CTO is the full approval."

## S7 - What you get (cream2)

**Title:** "Every person's level comes with the evidence behind it."
**Message:** the deliverable is concrete, individual, and defensible.
**Visual:** v1's skill-report card, realistic: name, L0-L5 strip, six scored dimensions with bars, "what we saw" verbatim quotes, path-to-next-level strip. Line under the card: "Built for development sequencing, not performance reviews." *(Check with Pulkit: this line is an "X, not Y" construction - keep for the political cover, or rephrase.)*

## S8 - The path (cream)

**Title:** "Three moves take a portco from baseline to proven capability gains."
**Message:** the diagnostic is move one of a repeatable path.
**Visual:** three numbered cards, weight on card 1:
1. **Measure** - 2-3 weeks, one portco: capability map, readiness scorecard, sequenced 100-day plan.
2. **Move the levels** - 12-week cohorts grouped by assessed level, practiced on real tickets.
3. **Prove it moved** - quarterly re-measure with telemetry on; movement in numbers your IC can read.
Strip under cards (labeled illustrative): hand-corrected agent output ↓ + agent-authored share ↑ → cycle time on comparable tickets ↓ → capacity per head ↑. Closing line: "An ugly baseline seen now is pre-diligence on your terms."

## S9 - Why us (cream)

**Title:** "We've watched AI deployment fail from the other side of the table."
**Message:** we screen the engineers labs deploy into companies; deployment lands, absorption doesn't; we work for the buyer's side.
**Visual:** three-step flow: "Frontier labs deploy engineers into companies like your portcos" → "Deployment lands; absorption doesn't - and no one deploying is paid to fix that" → "We assess the absorbers - the same instrument, pointed at your teams." Client line: "We screen FDEs for ElevenLabs · Retell · +3 YC-backed AI cos." Cred cards: "Pulkit Walia - built the engineering assessment and skilling system at Urban Company ($3B IPO), a tech-enabled trades marketplace" · "Rohit Jain - 25,000+ engineers trained, hundreds of big-tech interview loops."

## S10 - Offer (forest)

**Title:** "Start with one portco - $1,000 a seat, results in three weeks."
**Message:** small, fast, fund-payable, and the target portco is obvious.
**Visual:** left card "what you get": 2-3 weeks · level map by function, with evidence · readiness scorecard · sequenced 100-day plan · typical run: 30-40 seats, $30-40k, fund or portco budget. Right chevrons "then, if it earns it": one portco → portfolio dashboard → upskilling / deal diligence. IC-forwardable line, serif italic: "For $40k and three weeks we get a measured answer on whether [portco]'s AI spend is building capability or shelfware - before a buyer's diligence team asks." Nudge: "Start where engineering cost is the thesis." Close: "30 mins to scope it. We'll bring the instrument." Contact: Pulkit Walia · laoh.ai.

---

## Decisions locked (Jul 15)
1. 90%-at-L2 → "most", cite Shapiro.
2. Coy close cut → straight ask.
3. Scope → eng-led, stated on cover.
4. S6 trust strip → all four commitments true; print as stated.
5. Cover cred line → "frontier AI labs and 3 vertical AI companies"; named clients only on S9.
6. Titles → full MBB declarative sentences, one message each.
7. Levels → defined by tangible observable workflows; S4 shows input → output per stage for a non-technical reader.
