# Task 4: deepen the render pipeline

Branch `v2-render`, commits `f1392d0..HEAD`, all in `v2/components/hero/Globe.tsx`.
Stills in `docs/task-4-stills/`.

## Summary

Four things were asked for. Three shipped, one was measured and deliberately not shipped
because the canvas it would run on cannot carry it.

| Effect | Status | Where it runs |
|---|---|---|
| Depth of field | shipped, desktop only | point shader, no extra pass |
| Vignette | shipped, desktop and mobile | composer, after bloom |
| Directional motion blur | shipped, desktop only | point shader, no extra pass |
| Film grain in the composer | **not shipped**, see below | would have been a dead pass |

Bloom is untouched. Its five parameters were lifted verbatim into a `BLOOM` constant so
they cannot drift, and the held-match-dot crop below is pixel-identical before and after.

## Why depth of field is not a DepthOfField pass

The dome is a point cloud drawn with `depthWrite: false` and `depthTest: false`, and the rim
shell and arc are the same. The only thing that writes depth is the 12 city spheres. So the
depth buffer is empty: a `DepthOfField` pass reads it, sees the far plane nearly everywhere,
computes a maximum circle of confusion for every dot, and uniformly blurs the entire dome.
Unusable.

Depth of field is therefore done in the point shader. Each dot's distance from the focal
plane spreads it into a bokeh disc, which is exactly what a lens does to a point light, and
it costs no extra pass. Two properties worth noting:

- With `uAperture` and `uRotVel` at zero, every varying collapses to its old constant
  (`vRad` .42, `vSoft` .08, `vDim` 1, `vStreak` 0) and the fragment shader reduces to the
  previous `smoothstep(0.5, 0.34, d)`. An in-focus, unmoving frame is byte-identical to
  before. That is what makes the mobile path a genuine no-op rather than a cheap variant.
- Blurred dots are dimmed as they spread, so total energy is roughly conserved and the dome
  does not get brighter as it defocuses.

**Focus does narrative work.** During the scan it racks onto the active city, over the first
35% of each city's slot so it reads as a rack rather than a cut. From `MATCH_HOLDS_AT` it
settles onto the held match dot and stays there.

Two bugs found and fixed while verifying this, both visible in the stills history:

1. The blurred edge overran the point sprite and was clipped at the sprite bounds, so
   defocused dots rendered as rounded **squares**. The sprite now carries headroom for the
   falloff (`size >= disc * (1 + 0.6 * cocNorm)`). This measured slightly *faster*, because
   the truncated falloff had left corner fragments with a nonzero mask that blended instead
   of discarding early.
2. Focus was racking onto cities on the **back hemisphere**, which are culled and never
   drawn. That put the focal plane behind the dome and threw every visible dot out of focus
   at once; at p=0.47 the whole globe was soft. Back-facing targets now fall back to the
   front surface, using the same `z > 0.05` test the arc already uses.

## Motion blur: which velocity, and why

**Chosen: frame-to-frame rotation delta, times a 0.5 shutter** (a 180-degree shutter, the
fraction of a frame interval a real camera exposes for).

I implemented the analytic derivative first, as the brief's first option, and rejected it on
evidence. The analytic form reports rotation *per unit progress*. That number stays large
whenever the film sits inside the HOLD window, so parking the scroll mid-hold left the dome
permanently smeared while nothing was moving on screen. Users park constantly. Velocity per
frame is zero when parked, which is the entire point of motion blur.

It needs **no direction-change reset**, which was the brief's stated worry about this form.
The streak is a capsule centred on the dot, so reversing the sign of the velocity draws the
identical shape. It holds one previous scalar and accumulates nothing, and the smear never
feeds back into position, so geometry retraces regardless.

**Caveat on the named beats.** The brief names probe flight and match fly as the fast beats.
Both are DOM elements in `HeroFilm.tsx`, not WebGL, so the globe's composer cannot touch
them. Worse, the globe's alpha is already fading out from 0.56 and is gone by 0.63, so it is
barely on screen during matchFly. What this ships is blur on the thing that actually moves
in the globe: the dot field under rotation, which is fastest during the hold swing. **Blur on
the probe and the match card needs a DOM-side approach and is outside my file boundary.**

## Grain: measured, and deliberately not shipped

The brief asked for a noise pass under bloom, plus the one-line CSS change to remove the
duplicate. **Do not make that CSS change.** The premise does not hold here.

The globe canvas is `alpha: true` and is inset into `.theatre`, not the stage. A composer
pass can only touch pixels the globe already drew. I shipped the noise pass, forced its
opacity to 1.0, and photographed it: the grain lands **on the dots and nowhere else**. There
is nothing between them to grain, because those pixels are transparent and composite onto
the DOM behind. At the intended 0.32 opacity it is invisible.

So it was costing shader work for no picture, and I removed it. **Correction to an earlier
claim here: it was NOT costing a full `EffectPass`.** The composer coalesces consecutive
effects that need no depth attribute into one merged pass, and `NoiseEffect` is one of
those, so it would have merged with bloom and the vignette. The real cost was a few ALU ops
inside an already-existing fragment shader. Removing it is still right, since a few ALU ops
for zero picture is still worth nothing, but the premise as originally written was wrong.
`.stage::after` in
`hero.module.css` covers the whole stage, which is the only place stage-wide grain can live.

**The CSS change the orchestrator should make: none.** Leave `.stage::after` exactly as it
is. There is no duplicate to remove. If grain-under-bloom is still wanted as a look, it is a
stage-level change (grain beneath the theatre in the z-order), not a globe-level one, and it
belongs to whoever owns `hero.module.css`.

The vignette does *not* have this problem, and was kept: it darkens the dot field toward the
frame edge, and the dot field is most of what the canvas draws. Verified the same way, by
cranking darkness to 1.0 and photographing it. It also eases off as `gradeRef` rises, so it
cooperates with the dusk grade instead of double-darkening the room.

## Measurements

**Method.** Browser automation was unusable: its tab is permanently backgrounded
(`visibilityState: "hidden"`, `requestAnimationFrame` frozen), so the film does not even
mount. I drove the real Chrome binary headless instead, with `--use-angle=metal`, which gets
the actual GPU: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`, context not lost.

The globe runs `frameloop="always"`, so **parking the film at a fixed progress and letting
rAF run free with vsync disabled makes the frame cadence render-bound**, which isolates the
cost of the pipeline. An earlier scrub-driven version of the harness was discarded because
its per-step sleep set the cadence, not the render: it reported a flat 8.3ms median for both
before and after, which was just the 8ms sleep. Numbers below are the median of 280 frames
per park. Harness: `scratchpad/perf.mjs`, which lives in the session scratchpad and is NOT
in the repo, and the file boundary for this task does not allow adding it. **Treat every
number below as unreproducible from a clean checkout.** A re-run during the fix pass
(details in Fix pass, finding 3) reproduced the shape of the result but not the absolute
values, which is the cost of an uncommitted harness on a shared machine.

**Parked median frame time, milliseconds:**

| Park | Desktop before | Desktop after | Mobile before | Mobile after |
|---|---|---|---|---|
| p0.30 scan opens | 2.8 | 4.7 | 1.7 | 2.3 |
| p0.45 hold swing | 2.8 | 4.2 | 2.0 | 2.4 |
| p0.53 match holds | 2.8 | 4.9 | 1.9 | 2.3 |

**p95 frame time:** desktop 3.5-4.4 before, 6.9-9.0 after. Mobile 2.8-3.1 before, 4.2-4.4 after.

**Full-film scrub, driven as fast as CDP allows:** desktop median 2.2 to 4.0ms, p95 8.7 to
10.0ms, frames over the 16.7ms budget 0.2% to 0%. Mobile median 0.7 to 0.7ms, p95 2.2 to 3.2ms.

Desktop viewport 1440x900 at dpr 2, mobile 375x812 at dpr 3.

**Nothing exceeds the 16.7ms budget on this machine.** Zero frames over budget in every
parked run on both viewports, on an M4.

**That is a claim about an M4 and nothing else.** The same honesty the mobile section
applies belongs here: the added cost is sprite fill, which scales with GPU fill rate and
with the square of dpr. A p95 of 9.0ms on close to the fastest integrated GPU shipping
leaves 7.7ms of margin; an older integrated part several times slower on fill-bound work
would land past budget. These numbers show the added cost is small relative to the
baseline. They do not establish absolute smoothness on any other hardware.

## The mobile path, and its honest limit

**Mobile runs neither lens effect.** Aperture and streak are both zero, which collapses the
shader to the disc it drew before. It keeps only the vignette.

**The +0.4ms attributed to the vignette above should not be read as real.** The same
instrument is described two paragraphs down as unable to resolve a difference of that size
on mobile, so it cannot simultaneously resolve one. The mechanism agrees: the vignette
needs no depth attribute, so the composer coalesces it into the SAME `EffectPass` as bloom
rather than adding a pass, and a few ALU ops in an already-merged fragment shader do not
cost 0.4ms. Read the mobile delta as noise.

Reasoning: both effects spread point sprites, and sprite spread is fill cost, which is the
budget a phone has least of. On the M4 the mobile depth-of-field cost sat inside run-to-run
noise (1.7-2.3ms with, 1.7-2.2ms without), so **the measurement could not clear it**, and an
M4 is several times a real phone GPU. The rack focus is also close to illegible on a dome
375px wide, so it was buying the least of anything on the list.

**Limit to be explicit about: a 375px viewport on an M4 is not a phone.** I throttled nothing,
because the added cost here is GPU fill, and CPU throttling would not have captured it. These
numbers show the mobile path adds almost nothing; they do not prove absolute smoothness on
real mid-range Android hardware. That needs a device.

## Scrub retrace

Reaching p=0.47 forwards, scrubbing out to 0.62 and back, and diffing the two frames gives
11.25% of sampled bytes differing by more than 8.

**This is pre-existing, not introduced here.** The identical test against the original
`Globe.tsx` gives 6.7%. The cause is `driftRef.current += delta * SLOW`, the deliberate
wall-clock drift that keeps the globe from ever freezing, so the dome's rotation at a given
progress depends on how long you took to get there. My changes raise the number only because
defocused dots cover more pixels, so the same rotation difference paints wider. The added
effects hold no accumulated state of their own.

## Gates

- `npm run build` passes, TypeScript clean.
- `npx eslint` on the file: 6 errors, all pre-existing `react-hooks/immutability` complaints
  inherent to the r3f imperative style. Baseline is 7, so no regression.
- Bloom verified unchanged by crop comparison at p0.53: the held match dot, its halo and its
  rings are identical before and after, while the field around it gains bokeh.

## Stills

`docs/task-4-stills/`, all at 1440x900 dpr 2:

- `final-p0.31.png` scan early. Front dots crisp, back hemisphere soft and round.
- `final-p0.47.png` scan late. The front-focus fix visible: front sharp, back soft.
- `final-p0.53.png` match holds. Focus settled on the held green dot, field falls away.
- `final-p0.57.png` match resolved, card emerged, depth held through the transition.

---

# Fix pass

Review: `task-4-review.md`. Two code defects (Important 1 and 2) and three report
corrections (Important 3, 4, 5). No Criticals were raised. Commits `e905e69..d016c03`,
both touching `v2/components/hero/Globe.tsx` only.

## Finding 1: focus popped at the terminator

**Confirmed, and worse than a one-off.** `viewZ()` returned the true view z above world
z 0.05 and `FRONT_Z` at or below it. Those two values are 1.95 world units apart at the
crossing, so the focal plane stepped that far in a single frame every time a rack target
crossed the limb, and the globe free-spins through the whole scan window, so it fired
repeatedly rather than once.

**Fix.** Hand the focal plane back across a band instead of switching at a point:

```
const front = easeIO(seg(focusScratch.z, 0.05, 0.05 + FRONT_BAND));
if (front <= 0) return FRONT_Z;
return lerp(FRONT_Z, focusScratch.applyMatrix4(camera.matrixWorldInverse).z, front);
```

The band is one-sided, opening upward from the existing 0.05 test rather than straddling
it, so focus has already fully reached the dome front by the time the city is culled.
Straddling would have put the focal plane behind the dome for part of the band, which is
the bug `f5e8bd3` existed to fix.

**No hysteresis.** `front` is a pure function of the city's current world z. Nothing is
remembered between frames, so approaching the band from either side gives the same value
at the same z, and a backwards scrub retraces exactly.

### Verification

A numeric replica of the focusZ derivation (city placement, Y rotation, the rack lerp, the
match-hold lerp), swept at 201 parked progress values across the scan window 0.26 to 0.52,
each free-spinning at `SPIN` for 600 frames at 60fps. Parking isolates the terminator: any
frame-to-frame change in focusZ at fixed progress can only come from the globe turning.

| band | max single-frame ΔfocusZ | as ΔCoC | as % of MAX_COC |
|---|---|---|---|
| **none (shipped, before)** | **1.94872** | 0.7405 | **61.71%** |
| 0.15 | 0.16704 | 0.0635 | 5.29% |
| 0.30 | 0.07864 | 0.0299 | 2.49% |
| 0.45 | 0.04907 | 0.0186 | 1.55% |
| **0.60 (shipped, after)** | **0.03425** | 0.0130 | **1.08%** |
| 0.80 | 0.02289 | 0.0087 | 0.72% |
| 1.00 | 0.01610 | 0.0061 | 0.51% |

**Max single-frame ΔfocusZ: 1.949 before, 0.034 after. A 57x reduction, and the step is
now continuous rather than a jump.**

**Why 0.6 and not wider.** The table keeps paying past 0.6, but the return is small and the
band is not free: every unit of band is dome that no longer racks to a real focal depth.
0.6 is 28% of the visible hemisphere's z range and sits entirely at the limb, where the dot
is a few frames from being culled anyway. 1.0 would spend nearly half the hemisphere to buy
0.5 points of a percentage that is already 1.08.

## Finding 2: the vignette ramp was backwards

**Confirmed by photograph, and the review's reasoning is right.** A vignette multiplies
RGB and cannot touch pixels the canvas did not draw, so between the dots it does nothing.
What it darkens is dots. At day the dots are ink on cream, and darkening them adds
peripheral contrast. At dusk they are light on a dark room, which is the configuration
where darkening actually recedes the periphery.

Forced `darkness` to 1.0 and photographed both grades, against a `darkness = 0` control at
the same two parks (grade 1 at p0.36, grade 0 at p0.53). Measured dot contrast, p98 minus
p02 luminance, inside a patch on the dome limb:

| grade | dot contrast, vignette off → on at 1.0 | direction |
|---|---|---|
| 0 (day) | 138.7 → 150.1 | **+8.3%, contrast INCREASED** |
| 1 (dusk) | 148.6 → 93.6 | **−37.0%, periphery receded** |

Centre patches moved under 1% at both grades, which is the control working: the falloff is
not touching the middle of the frame.

**Fix.** `vignette.darkness = VIGNETTE_DUSK * grade`, replacing `lerp(0.42, 0.26, grade)`.
Day is now exactly zero rather than the strongest setting.

**Strength.** Reading the shader rather than guessing at the numbers:
`smoothstep(0.8, offset * 0.799, d * (darkness + offset))` over uv distance `d` from the
canvas centre. At `offset` 0.3 and `darkness` 0.5 the multiplier is:

| d | 0.00 | 0.30 | 0.40 | **0.45 (dome limb)** | 0.50 | 0.707 (canvas corner) |
|---|---|---|---|---|---|---|
| after | 1.000 | 1.000 | 0.944 | **0.881** | 0.801 | 0.379 |
| before, day (0.42) | 1.000 | 1.000 | 0.979 | 0.939 | 0.881 | 0.529 |
| before, dusk (0.26) | 1.000 | 1.000 | 1.000 | 0.999 | 0.985 | 0.810 |

Two things fall out of this that the strength discussion in the review could not see
without the curve. First, **`darkness` 0 is a true no-op, not merely weak**: it leaves
`d * (0 + offset)` below the falloff's inner edge for every `d` on the canvas, so the
day-graded majority of the film now pays nothing at all. Second, the dome is inscribed in
a square canvas and reaches only `d ≈ 0.45`, so the aggressive-looking corner values apply
to canvas the dome never occupies. The dome is untouched inside `d = 0.35` and dims 12% at
its limb.

Photographed at shipped strength: no ring, no visible edge to the falloff, and the day
frame is unchanged from the `darkness = 0` control (limb dot contrast 138.7 → 138.7, a
0.0% delta, which is the no-op showing up in pixels). Run-to-run scene drift moves these
patch numbers about 1%, so the dusk measurement at shipped strength (−3.4% at `d = 0.4`)
is near the noise floor; the transfer curve above is the load-bearing evidence for
strength, and the `darkness = 1.0` photographs are the load-bearing evidence for direction.

`offset` stays at 0.3. It sets where the falloff begins, and moving it outward while
raising `darkness` to compensate lands in the same place.

## Finding 3: the desktop headroom claim overstated

Report corrected in place, above. "Nothing exceeds the 16.7ms budget in any configuration"
now reads as a claim about an M4 and carries the same fill-rate and dpr caveat the mobile
section already carried. No code change; the finding was about wording.

## Finding 4: the perf harness is not in the repo

Correct. `scratchpad/perf.mjs` is real and was used, but it lives in the session
scratchpad, and this task's file boundary does not permit adding files to the repo. The
report now labels its numbers unreproducible from a clean checkout rather than leaving that
to be discovered. Committing the harness needs to be a follow-up owned by someone whose
boundary allows it.

## Finding 5: the mobile +0.4ms was inside the stated noise band

Correct, and the mechanism agrees with the review: the vignette needs no depth attribute,
so the composer merges it into the same `EffectPass` as bloom instead of adding one, and
merged ALU does not cost 0.4ms. The report now reads that delta as noise. The related claim
in the grain section, that the removed noise pass was "costing a full `EffectPass`", was
wrong for the same reason and is corrected in place.

## No performance regression from either fix

Re-measured with the same harness, **interleaved** rather than back to back, because other
agents were building on this machine throughout. Three rounds of prefix → fixed, each round
covering desktop 1440x900 dpr2 and mobile 375x812 dpr3, three parks plus a full-film scrub.
`prefix` is `69df647`, `fixed` is `d016c03`. Median of the three rounds' medians, with the
individual rounds shown so the spread is visible:

| park | prefix | fixed | delta |
|---|---|---|---|
| desktop p0.30 scan opens | 2.70 [2.7, 1.6, 3.3] | 2.80 [2.8, 6.0, 0.3] | +0.10ms |
| desktop p0.45 hold swing | 2.70 [2.7, 3.0, 2.4] | 2.90 [2.9, 0.7, 3.1] | +0.20ms |
| desktop p0.53 match holds | 3.10 [2.8, 3.1, 7.1] | 3.50 [3.5, 6.4, 2.7] | +0.40ms |
| desktop scrub whole film | 2.30 [2.3, 2.0, 3.4] | 2.60 [2.6, 4.5, 2.1] | +0.30ms |
| mobile p0.30 scan opens | 2.00 [2.2, 2.0, 0.9] | 2.00 [2.3, 0.5, 2.0] | 0.00ms |
| mobile p0.45 hold swing | 2.10 [2.2, 2.1, 2.1] | 2.20 [2.2, 2.6, 2.2] | +0.10ms |
| mobile p0.53 match holds | 2.20 [2.2, 2.1, 2.2] | 2.30 [2.3, 2.4, 2.2] | +0.10ms |
| mobile scrub whole film | 0.70 [0.7, 0.7, 0.9] | 0.90 [0.9, 1.0, 0.9] | +0.20ms |

**Every delta is smaller than the spread within its own arm** (desktop prefix p0.53 ranges
2.8 to 7.1 across identical runs), so this shows no measurable regression rather than a
small real cost. That is the honest reading, and it is what the mechanism predicts: finding
1 adds one clamp and one lerp per rack target per frame on the CPU, twelve cities at most,
and finding 2 changes a uniform's value without changing what the shader does per pixel.

Frames over 16.7ms: 0.0% in every run except three, all desktop, all at or below 0.7%, and
they appear in both arms (`prefix-r3` twice, `fixed-r3` once), so they track machine load
rather than either arm.

Absolute values sit below what the original report recorded for the same "after" state
(4.2-4.9ms desktop there, 2.8-3.5ms here). Interleaved A/B is valid regardless, since both
arms saw the same machine, but the gap is a concrete example of why finding 4 matters.

**Mobile did not regress.** Depth of field and motion smear remain desktop-only; the fix to
finding 1 changes a CPU-side value that mobile multiplies by a zero aperture, and mobile
still runs the vignette, now at zero darkness through the day-graded frames.

**Reduced motion still works.** No change to either gate.

## Gate

`cd v2 && npm run build` passes, TypeScript clean, 6/6 static pages, on both commits.

## Not fixed, and why

**Minor 6, `uAperture` not gated on `reduced` while `uRotVel` is.** Left as is. It is a
one-line change but it is not obviously correct: `prefers-reduced-motion` is a request to
remove motion, and a bokeh falloff on a parked frame is a static look, not motion. Gating
it would remove a deliberate part of the picture from reduced-motion users on the strength
of a symmetry argument. The review itself stops short of calling it a violation. It wants a
decision from whoever owns the reduced-motion look, not a reflex.

**Minor 7, whole-frame bloom character not established.** Not a code defect and not a
one-liner: it asks for a new measurement, whether `vDim` pushes defocused dots below
`luminanceThreshold` and changes what blooms across the field. Bloom's parameters are
confirmed untouched and this fix pass did not go near them.

**Minor 8** required no action by the review's own finding.
