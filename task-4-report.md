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

So it was costing a full `EffectPass` for no picture, and I removed it. `.stage::after` in
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
per park. Harness: `scratchpad/perf.mjs`.

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

**Nothing exceeds the 16.7ms budget in any configuration.** Zero frames over budget in every
parked run on both viewports.

## The mobile path, and its honest limit

**Mobile runs neither lens effect.** Aperture and streak are both zero, which collapses the
shader to the disc it drew before. It keeps only the vignette, whose cost is the +0.4ms
above.

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
