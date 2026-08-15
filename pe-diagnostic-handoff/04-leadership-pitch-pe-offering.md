# AI Capability Diagnostic & Upskilling for Mid-Market PE
*Leadership pitch — v0.2. Companion to docs 01–03 (framework, assessment, upskilling).*
*Target: middle-market PE firms and their portcos — tech-enabled services, skilled trades roll-ups, healthcare services.*

## Where we sit, and why we see what sponsors can't

Through Laoh we run live, simulation-based screening of Forward-Deployed Engineers and AI-native engineers for frontier AI companies — ElevenLabs, Retell, and three more YC-backed AI-native companies. FDEs are the people whose entire job is deploying AI into enterprises; we assess who's actually capable of it. From that side of the table we see the pattern the deployment industry doesn't tell its customers: **deployment happens, value unlock doesn't — because the receiving organization can't absorb it.** The best FDE on earth drops an agentic system into a team of L2 users with zero readiness infrastructure, and it decays into an unused license line within two quarters. Labs and integrators bill for deployment either way. Nobody on that side is paid to fix the absorption problem. We're building the offering that solves it from the buyer's side.

Founding credibility: Pulkit Walia built the assessment and skilling systems behind Urban Company's zero → $3B IPO — a tech-enabled skilled-trades marketplace, i.e., exactly the category mid-market PE is rolling up. Rohit Jain has trained 25,000+ engineers and run hundreds of big-tech interview loops. Assessment-at-scale in this exact sector profile is the thing we have already done.

## Why now — three market facts

1. **AI has moved from narrative to diligence requirement.** In 2026 healthcare-services deals, buyers demand *measurable* operating impact (revenue-cycle improvement, cost savings); pilot-stage AI claims no longer justify valuation uplift, and assets without credible proof face valuation pressure (PwC 2026 healthcare deals outlook). Capability measurement is now exit-relevant, not an HR nicety.
2. **Most portfolios can't show AI returns, and BCG says why:** they're stuck at "Deploy" — licenses handed out, operating model unchanged — which "rarely creates measurable and meaningful value." The value is in "Reshape": rethinking work function by function, piloting at one portco, replicating the playbook (BCG, *Inside the AI-First PE Firm*, 2026). Reshape requires knowing who can do what. That measurement doesn't exist in the mid-market.
3. **Mega-funds are building this in-house** (Vista's Agentic AI Factory; the "AI Operating Partner" role per Korn Ferry). Mid-market firms — where operational value creation, not multiple expansion, is now the primary return driver — have no equivalent and can't build one. They buy playbooks. This is one.

## The core argument: capability is invisible, and invisible things don't get managed

Two research anchors make the pitch defensible:

- **People misjudge their own AI capability by ~40 points.** METR's RCT: experienced developers were 19% slower with AI while believing they were 20% faster. Every self-reported adoption survey a portco sends its sponsor is noise. Only observed, task-based assessment produces a real number. (Assessment design is our trade.)
- **Organizations gate what individuals can do.** DORA 2025 (Google, ~5,000 professionals): AI *amplifies* — it magnifies well-run orgs and magnifies dysfunction; returns hinge on seven organizational capabilities (data ecosystem, internal platforms, clear AI stance, version control, small batches...), none of which are individual skills. In plain terms: advanced AI work means trusting output no human fully reviewed, and whether that's safe depends on infrastructure — sandboxes, verification systems, data access, policy — that only the company can provide. **A highly skilled person inside an unready org is forced to work at the level of the org, not their skill.** That's why "we hired AI-native people and nothing changed" is the most common failure mode.

So the diagnostic measures two axes: **people** (Dan Shapiro's five levels, L0 autocomplete → L5 software factory, hardened into behavioral gates — docs 01–02) and **organization** (a five-dimension readiness scorecard built on DORA — countable checks: % of systems with agent-safe replicas, % of data sources agents can query, CI-gated merges, written agent policy, spend per builder). Same scorecard for every portco: portfolio-comparable.

## What the levels mean across different roles — honestly

The ladder is not a universal ranking, and pretending every employee should climb it is how frameworks die on contact with a real company. Shapiro's levels measure one specific thing: **how much production work you can safely delegate to agents.** That applies fully only to people whose output is buildable artifacts. Everyone else needs a different, role-honest question. What actually matters per group:

**Portco builders (dev, IT, data engineering).** Full ladder applies. Realistic targets: L3 broadly, L4 for seniors. **L5 is a portfolio-level asset, not a portco target** — a $5–20M EBITDA services company cannot justify or retain a factory-building team, but a sponsor can maintain one small L5 core whose platforms every portco's L3/L4 people operate and extend. (This mirrors Vista's structure, scaled down.)

**Adjacent technical (BI, RevOps, sysadmins, integration analysts).** Truncated ladder, ceiling around L3/L4-on-components: they assemble automations from existing blocks and supervise them. In roll-ups this group quietly matters most — every add-on acquisition is a systems-integration bill, and an L3/L4 adjacent-technical layer makes integrations dramatically cheaper and faster. That's a sector-specific unlock worth naming to any buy-and-build sponsor.

**Frontline ops (dispatchers, schedulers, RCM staff, service coordinators, clinical ops).** Not on the coding ladder at all, and putting them on it insults everyone's intelligence. Their track (doc 01, O-track): use agent workflows → supervise them → handle escalations well → know when the output is wrong. Their two contributions that decide whether anything works: **domain judgment to catch bad agent output, and feeding the company brain** — their tacit knowledge (which plumber to dispatch, which claim code bounces) becoming agent-readable. The measurable unlock is capacity per head, which in labor-cost businesses is the EBITDA line itself.

**Portco leadership.** M-track: restructure around outcome review, fund readiness infrastructure, resist the temptation to declare victory at Deploy. An M0 CEO caps the whole company at L2 regardless of anyone's skill.

**PE investment team.** They are not builders and never will be; targeting them with the ladder would be selling them nonsense. Two real needs: (a) *working fluency* — agents drafting memos, running screens, building comp sets while they judge (the L2–L3 analog for analysis work, near their practical ceiling and genuinely valuable); (b) **capability-diligence literacy** — the ability to read a level distribution and readiness scorecard for a target and adjust price or the 100-day plan accordingly. Given that AI claims now face diligence scrutiny, this literacy is underwriting skill, not tech enthusiasm.

**PE operating team / value-creation heads.** Our buyer. They don't climb the ladder; they run the scoreboard — diagnose portcos, sequence investment (people vs. infrastructure), hold management accountable to movement per quarter. The framework is *their* operating tool; the diagnostic is what makes it usable without hiring an AI Operating Partner per portco.

**The distribution, not the ladder, is the point:** a working portco looks like a few architects (shared at portfolio level), a thin layer of assemblers, a broad base of competent operators with domain judgment, and leadership that reads the scoreboard. Value dies when any layer is missing — L5 platforms without L3 operators sit unused; L3 enthusiasm without L4 assemblers never compounds; everything without readiness infrastructure stalls at Deploy.

## Where these sectors look for value creation (what the diagnostic plugs into)

- **Tech-enabled services:** cost-to-serve and capacity-without-headcount — margin is labor arithmetic, so operator-level (O-track) gains flow straight to EBITDA. Customer service and back-office are BCG's named high-yield zones.
- **Skilled trades roll-ups (HVAC, plumbing, electrical, roofing, pest — among the most active consolidation categories in 2026):** scheduling/dispatch/quoting automation, call-center leverage, and above all **integration cost per add-on** — the adjacent-technical L3/L4 layer as a repeatable integration machine across acquisitions.
- **Healthcare services:** revenue-cycle management is the proven AI value pocket sponsors emphasize, plus workforce optimization; and the exit angle — demonstrated, measured AI operating impact now attracts competitive interest while unproven claims get discounted. A quantified capability + readiness scorecard is diligence-ready evidence.

## Engagement model — where we start

**Entry product: the Capability Diagnostic. $1,000/seat.** Sold to the operating partner / head of value creation, run at 1–2 portcos as the pilot. Per seat: a live, simulation-based observed assessment (2 hours, role-matched task — the method proven in our hiring practice, built fresh for this offering), scored against the behavioral rubric, producing an individual level + evidence report. Per company: the aggregated capability map (level distribution by function), the org-readiness scorecard, and a sequenced 100-day recommendation — what to fix first, people or infrastructure, and in which function. A 40-person portco diagnostic ≈ $40k: pocket change against a value-creation plan, priced to be a no-committee decision.

**Why diagnostic-first is the right wedge:** it's fast (2–3 weeks per portco), it produces a number the operating partner can put in front of an investment committee, and it creates its own follow-on demand — every capability map ends with visible gaps and a sequenced plan we're positioned to execute (the 12-week upskilling engine, doc 03; retainer pricing deferred until pilots teach us the shape).

**Expansion path:** portco pilot → portfolio-wide scorecard (same instrument, comparable across companies — the operating partner's dashboard) → upskilling engagements where the map shows the gaps → capability diligence on new deals (pre-close assessment of targets, where the healthcare exit-multiple logic applies).

## The pitch, in five sentences

1. Your portcos have AI licenses, and BCG's research says that's exactly why nothing shows in the P&L — Deploy without Reshape doesn't book value, and Reshape requires knowing who can do what.
2. That knowledge doesn't exist today, because people misjudge their own AI capability by ~40 points (METR) — every adoption survey in your portfolio is noise.
3. We measure it live and in simulation — the same way we screen forward-deployed engineers for frontier AI companies like ElevenLabs and Retell, and the way we built assessment at Urban Company from zero to a $3B IPO in exactly your sectors.
4. $1,000 a seat gets you, per portco, a defensible capability map and readiness scorecard with a sequenced 100-day plan — and across the portfolio, one comparable dashboard, which in today's market is also exit-diligence evidence.
5. The mega-funds built this muscle in-house; the diagnostic is how the mid-market gets it without hiring an AI Operating Partner for every portco.

## Reference stack

- Dan Shapiro, *The Five Levels* — the people ladder (danshapiro.com)
- DORA 2025 *AI Capabilities Model*, Google, ~5k professionals — the org axis (dora.dev/ai/capabilities-model/report/)
- METR RCT 2025 — the perception gap; why observed assessment (metr.org)
- BCG 2026, *Inside the AI-First Private Equity Firm* — Deploy/Reshape/Invent (bcg.com)
- Vista, *Agentic AI Factory*; Korn Ferry, *The AI Operating Partner* — mega-fund precedent
- PwC 2026 healthcare deals outlook — AI as diligence requirement; measured impact vs. discounted claims
- Simon Willison / StrongDM — L5 exists in production; useful as vision, not as a mid-market promise (simonwillison.net/2026/Feb/7/software-factory/)

## Open items

1. Diagnostic ops: assessor pool and rubric calibration for non-builder roles (O/S-track simulations need design work — our hiring simulations cover builders well).
2. Pilot candidate: which operating partner relationship do we approach first, and do we discount the first portco in exchange for a case study?
3. Run the instrument on our own team first (docs 01–03) so the pitch carries a before/after distribution as proof.
