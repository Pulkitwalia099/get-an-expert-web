# Hero motion plan: progress ledger

Plan: docs/hero-motion-plan.md
Worktrees: gae-v2-hero=v2-motion (DOM), gae-v2-render=v2-render (WebGL), gae-v2-sound=v2-sound (audio)
Base for all three: origin/v2-next @ ca83fbb

Wave 1 (parallel, disjoint file sets):
- Task 1 (HeroFilm.tsx + hero.module.css) -> v2-motion : IMPLEMENTED ba9de78..dfc64f8
    review: spec FAIL (zero-layout bar not met; layout events 1365->362, -73%), quality APPROVED
    with 3 Important. I1+I2 handed to motion-t3 phase 1. v2-sound MERGED into v2-motion (clean).
- Task 4 (Globe.tsx only)                 -> v2-render : COMPLETE (ba9de78..fda43b0, pushed)
    review: spec FAIL->fixed, quality NOT APPROVED->fixed, re-review APPROVED
    ACCEPTED DEVIATIONS (flag to Pulkit): (1) composer grain pass NOT shipped, proven to draw
    nothing because canvas is alpha:true and only dots get grained; .stage::after CSS grain stays
    as-is, no change needed. (2) depth of field implemented in the point shader, not a DepthOfField
    pass, because the dot field uses depthWrite/depthTest false so a standard pass has no depth buffer.
- Task 5 (new files only, no HeroFilm)    -> v2-sound  : COMPLETE (commits a26c7f2..005bbcc, review clean, spec PASS + quality APPROVED)

Wave 2 (sequential, after wave 1 merges):
- Task 2 (coordinate lock) : DROPPED TONIGHT by time triage at 01:20. Least visible of the
    remaining work; branch base is clean so it can run as a fresh task any time.
- Task 3 (easing + arcs) : DISPATCHED 01:25 as motion-t3, 3 phases on v2-motion:
    P1 = Task1 fixes I1 (quantize scan counter, ~234 of 362 layout events) + I2 (burst() forced
    layout on the delivery beat). P2 = wire filmAudio + SoundToggle. P3 = easing vocabulary + arcs.
    DEVIATION: combined fixes with a new task in one agent, against the skill's one-task-per-agent
    rule, because both need HeroFilm.tsx and a second dispatch round-trip cost more than the
    isolation was worth at 1h35m remaining. Recorded as a decision, not an accident.

Minor findings roll-up for final review:
- [T5] audio.ts:734-745 gesture listeners build the full AudioContext node graph on first
  click even under reduced-motion. No sound plays; wasted allocation + possible browser warning.
- [T5] Fast-scrub tests cover only two extremes (999-step paced scroll; single p:0->1 jump).
  A realistic ~16.67ms/frame flick is UNTESTED, and in that regime the code may silently DROP
  ticks rather than collapse them. Needs a manual trackpad-flick pass on the integrated film.
- [T5] Report mislabels the eslint react-hooks/set-state-in-effect finding as a "warning";
  it is 1 error. Genuinely pre-existing (HeroFilm.tsx:136 trips the same rule), build still passes.
- [T5-deferred] SoundToggle is fixed bottom-right z-70. Not yet checked against what Tasks 1/4
  place in that corner. Resolve during integration, not as a Task 5 defect.

## Overnight run (set 2026-07-20 00:27 PDT)

HARD DEADLINE: laptop sleeps at 03:00. caffeinate pid 98420 holds it awake until then.
Pulkit reviews in the morning. He is asleep; do not ask questions, make the call and record it here.

Deadline strategy, so there is ALWAYS something reviewable:
- By 02:30: stop starting new work. Merge whatever passed review into v2-motion.
- By 02:45: deploy a preview from v2/ (project get-an-expert-v2) no matter how much landed.
- Write the morning summary to MORNING.md at the repo root before 03:00.
- Never leave the tree mid-merge or with conflict markers. A clean partial result beats a broken full one.

Priority if time runs short (most visible difference first):
1. Task 3 easing + arcs   (what Pulkit will actually SEE)
2. Task 4 render pipeline  (visible depth and grade)
3. Task 1 transform migration (foundation, invisible but gates everything)
4. Task 5 sound            (self-contained, can land any time)
5. Task 2 coordinate lock  (correctness, least visually obvious)
Note: 1 gates 2 and 3, so it cannot actually be deprioritized. Listed for triage clarity only.

NEVER overnight: push to master, force push, touch midsesh.com, vercel --prod, trigger image generation.

## Task 5 integration (apply at merge time, after T1+T4 land)

Two lines in HeroFilm.tsx:
  import { filmAudio } from "./audio";
  const apply = (p) => { filmAudio.update(p); ...existing body unchanged }

  import SoundToggle from "./SoundToggle";
  render <SoundToggle /> as a DIRECT child of the top-level returned element.
  CRITICAL: must NOT be nested inside .stage or anything Task 1 gave a per-frame transform.
  A transformed ancestor creates a containing block and would break its position:fixed.

Also from T4: remove the duplicate CSS grain overlay in hero.module.css (T4 moved grain into
the composer). Exact line is named in gae-v2-render/task-4-report.md. T4 was forbidden from
editing that file, so the orchestrator applies it.

## RUN COMPLETE 02:26

Task 1 COMPLETE (fixes I1+I2 landed via motion-t3 phase 1)
Task 3 COMPLETE (spec PASS, quality APPROVED, 4 Minor) commits d6e317f, b2feec6
Task 4 COMPLETE, Task 5 COMPLETE. Task 2 NOT DONE (dropped by time triage).

Integrated branch: v2-motion @ b2feec6, pushed. Build green. Merges clean into v2-next (verified).
PREVIEW: https://get-an-expert-v2-lhvg4aziy-pulkitwalia099s-projects.vercel.app
Morning artifact: https://claude.ai/code/artifact/899a6ddd-035c-4d5b-89a8-500c2065e46a

MY MESS TO CLEAN: stray Vercel project "v2" created by a deploy from an unlinked worktree.
  Cause: .vercel/ is gitignored so fresh worktrees have no project link and the CLI creates
  a project from the folder name instead of failing. ALWAYS `vercel link --project get-an-expert-v2`
  before deploying from a new worktree. Delete: vercel.com/pulkitwalia099s-projects/v2

NOT MERGED into v2-next on purpose: Pulkit has not seen it. That is his gate, not mine.
