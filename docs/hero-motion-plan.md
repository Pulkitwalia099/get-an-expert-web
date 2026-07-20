# Hero film motion plan

Execution plan for making the hero film feel premium. Audited from `v2-next` on 2026-07-20.
Companion artifact: https://claude.ai/code/artifact/a7339498-d66f-4384-99cb-fd59021b43a8

The choreography is NOT in question. Beats, timings and phase boundaries in `film.ts` came from
the approved prototype and are correct. This plan changes only how those beats are executed.

## Global constraints

These bind every task. A change that violates one is a defect regardless of what else it achieves.

1. **The film's choreography must not change.** Every beat fires at the same film-progress value
   it fires at today. Phase boundaries in `film.ts` PHASES are fixed. If a task needs a new
   timing constant, it is added alongside, never by editing an existing boundary.
2. **Only `transform`, `opacity` and CSS custom properties may be written per frame.** No
   per-frame writes of `left`, `top`, `width`, `height`, `padding`, `margin`, `maxWidth`,
   `borderRadius`, `filter`, `display` or `zIndex`. This is the whole point of Task 1.
3. **Design tokens only.** Colours come from `v2/app/globals.css` @theme or `hero/tokens.ts`.
   Never a raw hex in a component.
4. **Copy rules are absolute.** No em dashes anywhere. Never the word "machine". Expert replies
   are immediate ("On it."), never scheduled. Do not alter existing copy strings.
5. **Reduced motion must keep working.** `prefers-reduced-motion` renders the finished frame with
   no pin and no audio. Every task preserves this.
6. **Mobile must not regress.** The film runs at 375px wide. Effects that cost GPU time need a
   reduced path on mobile, following the existing `mobile` prop pattern in `Globe.tsx`.
7. **The build must pass.** `npm run build` in `v2/` is the gate. TypeScript errors are failures.
8. **Never push to master. Never force push.** Branch, commit, push the branch only.

## Verification standard

"It looks smoother" is not evidence. Every task reports measured before and after numbers using
the method named in the task. A task whose report contains no measurements has not been verified.

---

## Task 1: Move the film onto transform and opacity

**Files:** `v2/components/hero/HeroFilm.tsx`, `v2/components/hero/hero.module.css`

**Problem:** The `apply(p)` function writes layout-triggering properties on every frame, roughly
40 write sites between lines 219 and 463. Each forces a synchronous layout recalculation before
paint. The 15 existing `will-change` hints cannot help, because the compositor cannot handle
these properties.

**Required changes:**

- Every positional animation moves from percentage `left`/`top` to `transform: translate3d()`.
  Elements get a static anchor position in CSS; the per-frame code only translates from it.
- Size animations become `scale()`. Where scaling would distort type, apply a counter-scale to
  the inner text wrapper so glyphs stay at their intended size.
- The match card's growth from dot to card (currently interpolating `left`, `top`, `transform`,
  `borderRadius`, `padding`, `maxWidth`, `marginLeft` simultaneously) becomes a FLIP: measure the
  start and end rects once on mount and on resize, then interpolate a single transform between
  them. Border radius, if it must animate, moves to a CSS custom property so it is not a layout write.
- The per-frame `filter: blur()` on the duo (line 278) is removed. Replace with a cross-fade
  between two stacked copies of the panel, one sharp and one with a static blur applied in CSS.
  A static filter rasterizes once; only opacity animates.
- The `display` none/grid toggle (lines 460, 463) is removed. Keep the element in the layout and
  drive it with opacity plus `pointer-events`.
- The `zIndex` flip at recede > 0.45 (line 279) is removed. Establish the stacking order once at
  mount so it never changes mid-film.
- Add `will-change: transform, opacity` to elements that animate, and remove it from elements
  that do not. Do not blanket-apply it; a promoted layer that never animates wastes memory.

**Explicitly not in scope:** easing curves, motion paths, timing. Task 1 must be visually
indistinguishable from today apart from being smooth. If the film looks different, something
was changed that should not have been.

**Verification:**
- Chrome DevTools Performance recording of a full scroll through the film, before and after.
  Report: scripting time, rendering time, painting time, and count of "Layout" events during
  the scroll. The after-recording must show zero forced synchronous layouts inside the scroll handler.
- Report frame count below 16ms budget as a percentage, before and after.
- `npm run build` passes.

---

## Task 2: Lock the globe and the DOM to one coordinate system

**Files:** `v2/components/hero/HeroFilm.tsx`, `v2/components/hero/Globe.tsx`

**Problem:** The match card interpolates from a 3D point projected out of the WebGL globe into
hardcoded percentage page coordinates (`HeroFilm.tsx` 409 to 411). The two systems agree only at
the viewport the film was tuned at. `docs/v2-sprint.md` records this as a known approximation:
the arc anchor tracks the probe vertically but is not pixel-locked, and globe framing was tuned
by eye.

**Required changes:**

- `Globe.tsx` projects the held match dot to screen-space pixels each frame (project the world
  position through the camera, convert NDC to CSS pixels using the canvas bounding rect) and
  publishes it through the existing `matchDotRef` channel, in pixels rather than percentages.
- `HeroFilm.tsx` consumes those pixels directly and drives the match card's transform from them.
  No percentage conversion, no tuned offsets.
- The WebGL arc's DOM-side anchor point uses the same projected pixel value, so the arc endpoint
  and the card origin are the same point by construction.
- Handle the resize path: on viewport resize the projection updates naturally, since it derives
  from the live canvas rect.

**Verification:**
- Screenshot the exact film-progress point where the card emerges from the dot at three viewport
  widths: 1440, 1024 and 375. In all three the card origin must coincide with the glowing dot.
  Attach the three screenshots to the report.
- Confirm the same at a non-default device pixel ratio if one is available.
- `npm run build` passes.

---

## Task 3: Build a real easing vocabulary and put travel on arcs

**Files:** `v2/components/hero/film.ts`, `v2/components/hero/HeroFilm.tsx`

**Problem:** The whole four-act film runs on two curves: `easeIO` (quadratic in-out) and
`easeBack` (one overshoot). A headline lifting away, a probe launching, a card docking and a panel
receding into depth all share one acceleration profile, so nothing has weight. Additionally every
positional move is a linear interpolation between two points, so everything travels in a perfectly
straight line. The v2 decisions record promised spring physics; none was built.

**Required changes:**

Add to `film.ts` a named easing set, each with a comment naming the gesture it serves:

- A spring settle with configurable stiffness and damping, for things that arrive and come to rest
  (match card docking, delivery landing). Implement as a closed-form damped oscillation so it stays
  a pure function of progress and remains scrub-safe in both directions.
- An anticipation curve that dips slightly before travelling, for the two launches (probe rise,
  match fly).
- A heavy ease for large slow objects (the session panel receding and returning), with slower
  acceleration and a longer settle than `easeIO`.
- A snap curve for small light elements (chips, the caret, scan card entries).
- Keep `easeIO` and `easeBack` and leave existing call sites that genuinely want them.

Add an arc helper: a quadratic Bezier between start and end with a perpendicular control-point
offset. Apply it to every travel path that currently uses a straight lerp, specifically the match
card's flight to the chat slot, the probe's return home, and the context payload's flight in.
The offset direction should read naturally, so travel rises and falls rather than sliding.

Add follow-through: multi-part elements stagger their parts by 40 to 80ms of film-progress
equivalent rather than arriving as one block. The receiving container acknowledges an arrival with
a small compression and spring-back.

**Scrub safety is critical.** The film is scrubbed in both directions. Every curve must be a pure
function of progress with no time-based state, no velocity accumulator, and no dependence on
previous frames. Scrubbing backwards must retrace exactly.

**Verification:**
- Scroll the full film forward then backward. Report that every beat retraces identically, with
  no drift, no stuck element and no accumulated offset.
- Record a screen capture of the four acts and attach it.
- `npm run build` passes.

---

## Task 4: Deepen the render pipeline

**Files:** `v2/components/hero/Globe.tsx`

**Problem:** The EffectComposer runs Bloom and nothing else (lines 431 to 439). Zero matches for
DepthOfField, Vignette, Noise or ChromaticAberration. Grain currently sits as a CSS overlay on top
of everything, which is why it reads as a filter laid over the picture rather than part of it.
The two fastest moves in the film render as crisp objects at a sequence of positions, with no
motion blur, which reads as teleporting.

**Required changes:**

- Add depth of field so the globe has a focal plane. The focal target follows the active scan city
  during the search and the held match dot once it resolves, so focus does narrative work.
- Add a gentle vignette to hold attention centre-frame. Subtle. If it is noticeable as a vignette
  it is too strong.
- Move film grain into the composer as a noise pass, positioned so grain sits under bloom the way
  it does on real film. Once this lands, reduce or remove the CSS grain overlay so grain is not
  applied twice.
- Add velocity-driven directional blur on the fast beats only (probe flight, match fly). It must be
  off during slow beats, since motion blur on a still image only costs frames.
- All four effects need a mobile path. Follow the existing `mobile` prop convention. Depth of field
  and motion blur are the expensive passes; consider dropping them entirely on mobile rather than
  running them cheaply.

**Verification:**
- Report measured frame time on desktop and at a 375px viewport, before and after, with the effect
  passes enabled. If the mobile frame budget regresses, the mobile path is wrong.
- Attach stills at four points in the film showing the focal plane doing its job.
- Confirm bloom still reads as it did; this task must not change the existing bloom character.
- `npm run build` passes.

---

## Task 5: Add the sound layer

**Files:** new `v2/components/hero/audio.ts`, plus a small hook-up in `HeroFilm.tsx`

**Problem:** There is no audio anywhere in the project. Not a file, not a library, not a stub.
This was never in the plan, and it is the highest ratio of felt quality to effort available.

**Required changes:**

Synthesize the cues with the Web Audio API rather than shipping audio files. This avoids sourcing
and licensing entirely, keeps the bundle unchanged, and lets every cue be tuned as code. Six cues,
tied to beats that already exist in `film.ts`:

| Beat | Cue |
|---|---|
| Probe rise | soft rising tone, quiet |
| City scan tick | short low pulse, one per city as the scan advances |
| Match holds green | clear resolve tone, the only bright moment |
| Chat dock | muted click |
| Delivery lands | airy swell |
| Finale | low tail that fades out |

Rules:

- **Muted by default.** Autoplaying audio loses people. Add a small unmute control on the stage,
  styled from tokens, that persists its state to `localStorage`.
- Audio never plays under `prefers-reduced-motion`.
- The AudioContext is created lazily on the first user gesture, never on mount. Browsers block it
  otherwise and it is wasteful.
- Cues are edge-triggered on beat entry, not continuous. Scrubbing backwards must not replay every
  cue in reverse: debounce so a fast scrub does not machine-gun the tones.
- Nothing in the audio path may block or delay a frame. Scheduling happens off the render path.

**Verification:**
- Confirm cues fire at the correct film-progress values, that a fast scrub does not produce a burst
  of overlapping tones, and that the muted default persists across a reload.
- Confirm no audio under reduced motion.
- `npm run build` passes.

---

## Out of scope

Task 6 from the artifact (weaving in generated art) is not in this plan. It depends on Pulkit's
generation runs and the asset directory `v2/public/assets/v2/` does not exist yet. Every asset has
a CSS fallback, so nothing here blocks on it.
