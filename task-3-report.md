# Task 3 report: fixes, sound wiring, and the easing vocabulary

Branch `v2-motion`. Three commits, one per phase:

| Phase | Commit | What |
|---|---|---|
| 1 | `ae44055` | Task 1 review findings I1 and I2 |
| 2 | `6d286b9` | sound module wired in |
| 3 | `d6e317f` | easing vocabulary, arcs, follow-through |

Files touched, all three phases: `v2/components/hero/HeroFilm.tsx`,
`v2/components/hero/film.ts`, `v2/components/hero/hero.module.css`. Nothing else.
`Globe.tsx`, `audio.ts` and `SoundToggle.module.css` are untouched. `PHASES` is untouched.
`npm run build` passes, TypeScript clean.

---

## Phase 1: the two review findings

### Method

Same approach the Task 1 report documents: a dedicated headless Chrome driven over CDP with
`Performance.getMetrics`, which reads Blink's own `LayoutCount` / `LayoutDuration` counters.
Each run scrubs from progress 0 to 1 over 8s (~960 frames) and diffs the counters. Every run
confirms it actually traversed the film (frames captured, final scrollY, and the counter
element reading 4,183) so a silent no-op scrub cannot pass as a clean result.

Baseline is `6b42ece` (pre-Phase-1), built and served from a **separate git worktree** at
`/tmp/gae-baseline` on port 3101, with the current build on 3102. I did not use `git stash`:
other agents have work in progress in this checkout and stashing would have taken theirs too.

Runs are **interleaved** (BEFORE, AFTER, BEFORE, AFTER, ...) as instructed, since other agents
are building on this machine.

### Full-film scrub, 3 runs each

| Metric | BEFORE | AFTER | Change |
|---|---|---|---|
| **Layout events** | 399 | **292** | **-27%** |
| Layout time | 50 ms | 48 ms | flat |
| Style recalc time | 282 ms | 288 ms | flat |

Per-run `LayoutCount`: BEFORE 389, 404, 404 / AFTER 293, 292, 292. The AFTER spread is
remarkably tight (3 events across 3 runs); the BEFORE spread is wider, which is itself
consistent with a per-frame string write whose hit count depends on frame pacing.

### I1: the counter. Correct diagnosis, but the review's magnitude does not hold

The review predicted removing "~234 of the 362" layout events. **The real full-film saving is
107.** I am reporting the gap rather than the headline because the reason matters for anyone
reading the budget later.

`LayoutCount` counts **layouts performed**, not invalidations. Several dirtying writes in one
frame coalesce into a single end-of-frame layout, and Blink also skips layout on frames where
nothing needs painting from it. So "the counter changes on 234 frames" was never going to mean
"234 layout events" one-for-one.

Isolating the scan window (scrubbing only 0.26 to 0.52, so all ~960 frames land inside the
beat) shows the counter's true weight cleanly:

| Scan window only | BEFORE | AFTER |
|---|---|---|
| Layout events | 477 | **243** |

**234 events removed**, which is exactly the figure the review modelled. So the review's
*attribution* was right and its *ranking* was right: the counter, not the chat dock, was the
dominant residual source. Its absolute full-film number was optimistic because of the
coalescing above.

The fix: the counter reports in hundreds and lands on the exact 4,183 at the end of the window.
It still climbs live and still reads as a scanner working (see `desktop-act2-the-search.png`,
which caught it mid-climb at "1,700 profiles scanned"). I chose quantization over a CSS
counter because `counter-reset` cannot portably take a `var()` in its integer position, and
generated content still dirties layout anyway, so the CSS route would have been more machinery
for the same or worse result.

### I2: `burst()`. Fixed, and the cost is real but only visible under throttling

The fix is structural and unambiguous: the chat rect now arrives from the frame's batched read
phase (`waitIn` is already 1 well before the delivery beat, so the rect is available for free),
the design tokens are resolved once at mount instead of via `getComputedStyle` mid-frame, and
the 46 nodes are fully styled while detached and inserted in **one** fragment instead of 46
interleaved append-then-style operations.

Two things I changed beyond the brief, both defensible:
- the disarm moved *after* the rect guard. Previously a missing rect disarmed the burst
  permanently, so the delivery confetti would silently never fire for that traversal.
- 46 cleanup timers collapsed to one.

**Measurement, reported honestly.** At native speed the delivery beat is *identical* before
and after: layout count 99 vs 99, p50 frame 8.3ms, zero frames over 16.7ms on both sides. The
review's claim that this was "the single most likely dropped frame in the film" **does not
reproduce on this hardware** at native speed, the same way Task 1's stutter did not.

Under **6x CPU throttling**, which is the device class the whole task was written for, the
signal appears:

| Delivery beat, 6x throttle | frameMax (3 runs) | frames > 16.7ms |
|---|---|---|
| BEFORE | 15.5, 18.5, 20.7 ms | 0, 1, 1 |
| AFTER | 15.9, 13.2, 16.1 ms | 0, 0, 0 |

Worst frame drops from 20.7ms to 16.1ms and the over-budget frames go 2 to 0 across three runs
each. That is a small sample and I would not defend it as a precise effect size, but it is
evidence in the predicted direction rather than an argument.

Note also that `LayoutCount` still cannot prove "zero forced synchronous layouts", exactly as
the review said: a forced layout and the natural end-of-frame layout increment the same
counter. The claim that the forced layout is gone rests on the code structure (there is now no
layout read after any write in the frame), not on that metric.

---

## Phase 2: the sound layer

Two changes, exactly as specified.

`filmAudio.update(p)` runs at the top of `apply()`, so cues edge-trigger off the same
film-progress value every other layer reads. The engine owns its own muting, debouncing and
scheduling.

`<SoundToggle />` renders as a **direct child of the top-level `<section>`**, outside `.stage`
and outside every subtree that carries a per-frame transform. This is load-bearing: the toggle
is `position: fixed`, and a transformed ancestor becomes the containing block for a fixed
descendant, which would drag the toggle around with the film. `.stage` also has
`overflow: hidden`, which would have clipped it.

**Where it landed, and collision check.** Fixed bottom-right, 20px inset, z-70. Nothing the
film puts in that corner collides: `.rail` is `right: 26px` but vertically centred (`top: 50%`,
translated -50%), and `.cue` is `bottom: 26px` but horizontally centred. At 375px `.rail` is
`display: none` and the toggle moves to a 14px inset. Confirmed visually at both widths, all
four acts. **No change to `SoundToggle.module.css` was needed.**

Reduced motion: the toggle does not render at all (`soundToggleRendered: false`, verified), so
there is no control and no audio.

---

## Phase 3: the easing vocabulary

### The curves, and the gesture each serves

All live in `film.ts`. Every curve is exactly 0 at t=0 and exactly 1 at t=1, which is what
makes them swappable at a call site without moving a beat's endpoints.

| Curve | Shape | Gesture, and why tuned this way |
|---|---|---|
| `easeSettle` | closed-form damped spring, freq 1.05, damping 0.74, **2.1% overshoot** | Weighted arrivals: match card docking, probe's fall home, payload landing. Damping picked from the overshoot formula `exp(-pi*z/sqrt(1-z^2))`, not by eye. On the probe's ~49vh fall, 2.1% is about 15px past the mark before it rocks back: reads as mass. The old `easeBack` threw it ~10% past, which is where the film's bounciness came from. |
| `easeSettleSoft` | freq 1.2, damping 0.58, **11.9% overshoot** | The delivered attachment landing. Its travel is small, so the firm settle would be literally sub-pixel and the spring would be decorative. I also raised that travel from 8px to 18px so the rock is legible at all. |
| `easeAnticipate` | dips to **-5%** over the first fifth, then decelerating cubic | The two launches: probe rise, match card launch. The dip is a half-sine, so it leaves from zero and returns exactly to zero, and the travel then *decelerates* in rather than arriving at full speed and stopping dead, which is what a plain `easeInBack` would do. 5% reads as intent; more reads as a cartoon wind-up. |
| `easeHeavy` | asymmetric power in/out, exponent 3.2, split at 0.42 | The session panel receding and returning, and the chat pane docking. Splitting below 0.5 means 58% of the window is deceleration: slower off the mark and a much longer settle than `easeIO`'s symmetric quadratic. The family is C1-continuous at the seam for any split and exponent (verified numerically: 3.1983 vs 3.1988 either side). |
| `easeSnap` | quartic ease-out | Small light elements: scan card entries, the delivered chip, the expert reply. Almost no acceleration ramp; light things are already moving by the time you notice them. |
| `easeDepart` | cubic ease-**in**, still accelerating at t=1 | The headline lifting away. A thing leaving frame never arrives, so it should not decelerate; if it eases out, it reads as having been stopped by the edge of the screen. |

**Kept deliberately.** `easeIO` stays on every opacity cross-fade (the dusk grade, search fade,
theatre, wait, finale fades, the resident and context message). A cross-fade wants a symmetric
ramp; a spring on an opacity is a flicker. `easeBack` stays on the match head pop, which is
genuinely a pop.

**Two places I deliberately refused a spring.** The chat `dock` drives the pane's `width`,
which reflows its text; overshooting it would rewrap type and snap it back, and it would add
layout events. It got `easeHeavy` instead, and the arrival is acknowledged by the *receiving*
element instead (below). And `mr`, the emergence hand-off into the fly, stayed on `easeIO`
because it is a hand-off, not an arrival.

**The composite curve.** The match card's flight is one gesture with two halves: it launches,
then it docks. Rather than pick one, `fly` crossfades anticipation into the settle with
`easeIO(flyRaw)` as the blend weight, so the card loads back toward the globe, travels, and
rocks once into the slot. Both inputs are 0 at 0 and 1 at 1, so the blend is too, and the
beat's endpoints do not move. A pleasant side effect: during the backwards dip the card's
scale rises slightly above 1, so it swells fractionally before it launches.

### Arc offsets

`arcLift(t)` is the normalized perpendicular profile of a quadratic Bezier (peaks at exactly
1.0 at t=0.5, exactly 0 at both ends, so endpoints are preserved). `arcPoint()` is the general
2D form with a perpendicular control-point offset.

| Path | Offset | Direction |
|---|---|---|
| Match card to the chat slot | `0.055 * viewport height` | up: it lobs rather than slides |
| Probe's return home | `0.035 * viewport width` | left: it swings out and comes back |
| Context payload's flight in | `0.03 * viewport height` | up |

The probe's fall is the one path using the full `arcPoint` helper, because its chord direction
is genuinely variable: the destination tracks the live composer, which shifts left as the chat
docks. A leftward bow exaggerates drift the probe already has, so the swing reads as motivated
rather than decorative. The other two chords have a known fixed orientation, so the
perpendicular is a single axis and applying `arcLift` to that one term is the same maths
without the vector work.

The match card's bow rides **raw** progress, not the eased value, so the rise and fall stay
symmetric about the middle of the travel while the anticipation dip and settle overshoot do
their work along the chord.

The payload's old comment said "no bottom arc: top is fixed". That was a constraint of
animating `left`/`top`; on a transform the lift is free and costs no layout, so it is gone.

### Follow-through

- **The match card assembles rather than prints.** Its name and credential trail the shell by
  `FOLLOW` (0.008 film-progress, ~60-100ms at natural scroll speed), converted into the
  `matchResolve` window's normalized space. Both parts still finish together at the window's
  end, so the beat does not lengthen.
- **The finale steps stagger.** 01, 02, 03 used to arrive as one printed block; they now snap
  in sequence, which is how the line is meant to be read.
- **The receiving container acknowledges the arrival.** The expert slot compresses 6% and
  springs back as the match card lands on it. Compression is fast (`easeSnap`) and recovery is
  a settle, so it reads as impact-then-recover rather than a symmetric wobble. It is a `scaleY`
  only: no layout, and the slot's `min-height` still holds the chat column so the docked panes
  do not move.

This needed one new constant, `SLOT_ACK = [0.665, 0.745]`, added **alongside** the phase map
and pinned to the existing end of `PHASES.matchFly` (0.68). No existing boundary was edited.

---

## Scrub safety

**The argument.** Every curve is a pure function of its argument. There is no time input, no
velocity accumulator, no reference to a previous frame, and no mutable state inside any curve.
The spring is a closed-form damped oscillation, not an integrator, precisely so that `f(0.4)`
is the same number whether the scrub reached 0.4 going forwards or backwards. A physics
integrator would not have this property and was not used.

One detail worth stating: the unnormalized spring step response does *not* reach exactly 1 at
t=1 (it is still ringing at the 0.5-1% level), and at a phase boundary that residual is a
visible snap. Both springs are divided by their own value at t=1, which pins both endpoints
exactly at a ~1% cost to the overshoot amplitude.

**Numeric verification of the curves.** Sampling every curve at 2001 points, then sampling the
same points in reverse order and comparing: **0 mismatches**, and every curve confirmed exactly
0 at 0 and 1 at 1. Overshoots and dips measured as quoted in the table above.

**End-to-end verification in the browser.** I walked the film through 21 scroll positions
forward, reading the live computed `transform`, `opacity`, `width` and `height` of 39 animated
elements at each, then walked the *same* positions backward and diffed.

Result: **54 mismatches, and the mismatch profile is byte-identical to the pre-change
baseline** run the same way:

| Element | Mismatches, baseline | Mismatches, Phase 3 |
|---|---|---|
| `flash` | 21 | 21 |
| `wait` | 11 | 11 |
| `msg` (the reply) | 11 | 11 |
| `match` | 8 | 8 |
| `duo`, `probe`, `chat` | 1 each | 1 each |

Identical counts on identical elements means **the new curves introduced nothing**. All 54
trace to three pre-existing, deliberate mechanisms, none of them an easing curve:

1. **The globe's free spin is time-based**, so `matchDotRef` projects a different point at the
   same scroll position on a later pass. This drives `flash` and `match`'s origin. Both sit at
   opacity 0.001 at the sampled points, so it is invisible.
2. **`typeReply()` is an intentional one-shot typewriter.** It changes the reply message's
   height, which changes the chat pane's height, which changes the duo's height, which shifts
   the probe's measured position. That is the single root cause of the `msg`, `duo`, `chat` and
   `probe` entries, all at progress 0.450, all height deltas of 18.75px.
3. **`waitPos` persists across frames**, which the Task 1 review already recorded.

**Every element whose curve I changed retraces exactly**: `payload`, `expertSlot`, `step`,
`chip`, `scanCard` have zero mismatches.

---

## Remaining verification

| Gate | Result |
|---|---|
| `npm run build` | passes, TypeScript clean |
| Reduced motion | finished poster, `trackHeight: auto` (no pin), stage `position: relative` (not sticky), chat expanded to 340px, ask and reply text filled, **sound toggle not rendered** so no audio |
| 375px overflow | `scrollWidth === clientWidth` at all four acts. Also clean at 1440. |
| Four acts captured | `/tmp/gae-shots2/desktop-act{1..4}-*.png` and `mobile-act{1..4}-*.png`, plus `reduced-motion.png` |
| File boundary | only the three files in scope; `Globe.tsx`, `audio.ts`, `SoundToggle.tsx` untouched |
| Choreography | `PHASES` untouched; one constant added alongside |
| Copy rules | no em dashes introduced (grepped the diff) |

Phase 3 added no layout writes: the arcs and springs are transform maths. Re-running the full
film comparison with Phase 3 on top confirms it: baseline 402, 403 layout events against
**289, 290** for the finished branch, which is the same as the Phase-1-only figure (292, 293)
within run-to-run noise. The easing work cost nothing.

---

## Concerns

1. **The review's I1 magnitude was optimistic and the budget note should be corrected for
   whoever reads it next.** The counter *was* the dominant source, but the full-film saving is
   107 events, not 234. Anyone planning against "the residual is now ~130" would be wrong; it
   is 292. The remaining budget is not the counter and not the chat dock: in the AFTER build
   the scan window still shows ~243 layouts across 960 frames with the counter changing only
   ~42 times, so roughly a quarter of frames are dirtying layout from something else. My
   strong suspicion is the sticky-positioned `.stage` plus Lenis/ScrollTrigger's own scroll
   handling, which is not application code. I did not chase it; it is out of Task 3's scope,
   but it is the actual floor and it should be identified before anyone budgets against it.

2. **I could not demonstrate I2's benefit at native speed**, only under 6x throttling, and
   that sample is 3 runs per side. The fix is right structurally regardless, but the review's
   "single most likely dropped frame" framing is not supported by measurement on this hardware.

3. **`easeSettleSoft` on the delivery required changing a travel distance** (8px to 18px) to be
   visible at all. That is a look change, small but real, and someone should eyeball it rather
   than take my word that 18px is right.

4. **Mobile counter clipping is pre-existing, not introduced, but I noticed it.** `.counter` is
   `white-space: nowrap` and wider than 375px, so it is clipped by `.stage`'s `overflow: hidden`
   (this is why the overflow check passes). Visible in `mobile-act2-the-search.png` as a
   truncated line. Out of scope here; worth a ticket.

5. **The globe's time-based spin means the emergence origin is not perfectly scrub-stable.** It
   is invisible today because the elements are at opacity 0.001 when it shows. Task 2 pins the
   card's origin to the projected dot, which will make this coupling tighter, so whoever does
   Task 2 should know it exists.
