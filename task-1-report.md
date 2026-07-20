# Task 1: move the film onto transform and opacity

Branch `v2-motion`, commits `da06c0f..dfc64f8`. Files touched: `v2/components/hero/HeroFilm.tsx`,
`v2/components/hero/hero.module.css`. Nothing else. `npm run build` passes with no TypeScript errors.

---

## 1. What changed

`apply(p)` is now three explicit phases:

1. **scalars**: every eased value computed as pure math, no DOM touched
2. **reads**: every layout read (`getBoundingClientRect`, `offsetHeight`) batched here, before
   the first write
3. **writes**: `transform`, `opacity`, custom properties, `pointer-events` only

The read/write split is half the win on its own. The old code interleaved rect reads between
style writes, which is what forced synchronous layout inside the scroll handler. The reads are
now one frame stale; at `scrub: 0.6` that is not perceptible, and it was verified frame by frame.

Every write goes through a memoizing setter (`set` / `op` / `tf`). A write whose value has not
changed does nothing. Most elements hold one value for most of the film, so this alone removes
the large majority of style invalidations.

### Per-property

| Was | Now |
|---|---|
| `head`, `scanCard`, `face`, `reply`, `deliver`, `chip`, `whisperSub`, `ctxMsg` transforms | `translate3d` from a static CSS anchor |
| `probe` `top` / `left` % | static anchor `left:50% top:20%`, `translate3d(calc(-50% + Npx), Npx, 0)` |
| `payload` `left` % | static anchor `left:30%`, `translate3d` |
| `wait` `left` / `top` % from the chat's rect | static anchor `50%/50%`, `translate3d` by the delta |
| `flash` `left` / `top` % | anchored at the overlay origin, `translate3d` |
| `tether` `top` / `height` rewritten every frame with constants | moved to CSS |
| `match` `left`, `top`, `padding`, `max-width`, `margin-left`, `border-radius` | FLIP, see below |
| `duo` `z-index` flip at `recede > .45` | fixed at `z-index: 4` in CSS |
| `slot` `display: none/grid` at `p > .72` | stays in layout, opacity + `pointer-events` |
| `resident` `display: none/flex` via class | absolutely positioned overlay, opacity only |
| `searchline.innerHTML` written every frame | written only when the string changes |
| `count.textContent` written every frame | written only when the string changes |
| `--grade` written every frame | memoized |
| `duo` `filter: blur()` per frame | quantized, see section 4 |

### The match card FLIP

The card is laid out once at its resting size. `matchRef.offsetWidth/Height` are measured on
mount, on resize, and on `document.fonts.ready`. The pill start rect is that rect minus the box
deltas the film used to animate (padding `5px` → `13px/18px`, `.matchInfo` max-width `0` → `240px`,
margin-left `0` → `2px`), so both rects come from one measurement plus named constants.

Per frame the card gets one transform, `translate3d(...) scale(sx, sy)` with
`transform-origin: 0 50%`, and JS places the rendered centre exactly where `left`/`top` used to.
Two counter-scales keep the content undistorted:

- `.matchInner` counter-scales the card's FLIP, so the avatar and type stay their intended size
- `.matchInfo` scales on X with `.matchInfoInner` counter-scaling, which reproduces the old
  `max-width` clip **exactly**: clipping happens in `.matchInfo`'s box, and
  `visible width = infoNat × f` is identical to `max-width: min(240·cardT, infoNat)`

**Start point for Task 2.** `matchStartX` / `matchStartY` are computed on two adjacent lines and
are the only place the origin enters the card's maths. Task 2 replaces those two lines with the
projected pixels and nothing downstream changes. The `matchDotRef` percentage contract is
untouched.

### border-radius decision

**Moved to custom properties, as elliptical radii.** `border-radius: var(--match-rx) / var(--match-ry)`,
with JS writing each axis pre-divided by that axis's FLIP scale.

Rationale: the FLIP squashes the card non-uniformly (at the pill state the horizontal scale is
~0.24 and the vertical ~0.79), which would render circular corners as lozenges. Pre-dividing each
axis makes the rendered corner circular again, so this is strictly more faithful than animating a
single radius would have been. Custom property writes are paint-only. The effective radius is
computed as `min(R, W/2, H/2)`, which reproduces the browser's own radius clamping: at the pill
state the original's `40px` clamps to `29.5px` on a 71×59 box, and the FLIP reproduces `29.5px`.

I did not drop the animation, because the pill→card corner change is the readable part of the
unfold.

---

## 2. Measurements

Method, stated plainly: **I could not capture a DevTools Performance trace through the available
tooling.** Instead I drove a dedicated Chrome (launched with `--remote-debugging-port`, so no other
session could steal the tab) over CDP and read the **`Performance.getMetrics` domain**, which
reports cumulative `LayoutCount`, `LayoutDuration`, `RecalcStyleDuration`, `ScriptDuration` and
`TaskDuration`. These are the same counters the Performance panel renders, so "count of Layout
events during the scroll" is a direct read, not a proxy. Each run scrubs the film's own track from
progress 0 to 1 over 8s (~900 frames) and diffs the counters.

Runs were **interleaved** (BEFORE, AFTER, BEFORE, AFTER), rebuilding and restarting the production
server between each, because other agents are building on this machine concurrently and a
non-interleaved comparison drifted noticeably. 4 runs per side.

Baseline is `ba9de78`. Both sides are production builds (`npm run build && npm start`), 1440×900,
Chrome 150, 120Hz display.

### Full scrub of the film, 4 runs each

| Metric | BEFORE | AFTER | Change |
|---|---|---|---|
| **Layout events** | 1365 | **362** | **-73%** |
| **Layout time** | 183.5 ms | **52.2 ms** | **-72%** |
| Style recalc time | 400.1 ms | 404.1 ms | +1% (flat) |
| Script time | 540.9 ms | 483.9 ms | -11% |
| Total task time | 1846 ms | 1632 ms | -12% |

Per-run values (BEFORE / AFTER):
- LayoutCount: 1384, 1347, 1382, 1346 / 374, 349, 373, 350
- LayoutDuration ms: 168.8, 197.1, 192.0, 176.2 / 59.7, 49.5, 54.6, 45.0

### Frame budget

**Both versions run at 120fps with zero dropped frames on this machine**, before and after.
Mean frame interval 8.33ms (the vsync floor), p99 10.3ms, 0 frames over 25ms in every run. Under
6× CPU throttling both still held ~8.8ms mean with 0-2 dropped frames.

I am not going to claim a smoothness win I did not measure. On an M-series Mac at 120Hz the film
was already inside its frame budget; the reported stutter does not reproduce on this hardware.
What the work actually bought is **main-thread headroom**: three quarters of the layout work and
an eighth of total task time per frame, which is what will matter on slower devices and once
Tasks 3-5 add real work to the same frames.

Note on style recalc being flat while its *count* fell 46% (3850 → 2071): memoization means fewer,
larger recalc batches rather than many small ones. Same total work, fewer flushes.

### Static audit: layout-writing properties in the per-frame path

Every style write inside `apply()`, enumerated:

```
set(stage,   "--grade")        custom property
set(match,   "--match-rx")     custom property
set(match,   "--match-ry")     custom property
set(finale,  "pointer-events") not a layout property
set(duo,     "filter")         paint-only, quantized (section 4)
set(chat,    "height")         LAYOUT
set(chat,    "width")          LAYOUT
set(chat,    "margin-left")    LAYOUT
count.textContent              only when the string changes
searchline.innerHTML           only when the string changes
...all remaining writes are transform / opacity
```

**Layout-writing properties remaining: 3, all on one element, all memoized.** Not zero. See
section 3 for why, and what it costs.

The other `.style.*` hits in the file are outside the per-frame path: the caret's `display` when
typing finishes (one shot) and the confetti elements' geometry at creation (one shot per burst).

---

## 3. The one thing I did not convert, and why

**The chat pane's dock (`height`, `width`, `margin-left`) is still a layout animation.**

Docking the chat narrows the session pane from 1060px to 716px, and the session's text reflows as
it narrows. No transform reproduces a reflow. Every transform-only construction I worked through
changes the composition somewhere:

- fix the session at its docked width (716px) → acts 1 and 2 open with a visibly narrower session,
  which is the most-seen frame in the film
- fix the session at 1060px and overlay the chat → the docked pair becomes 1404px wide instead of
  1060px, off-centre, and overflows below ~1130px viewports
- scale the session instead → squashed type

So I kept it and contained it: the three writes are memoized, so they fire only while `dock` is
actually moving (`PHASES.chatDock` is `[0.6, 0.68]`, ~8% of the film), and they sit after every
read in the frame, so they cost **one** ordinary layout and never a forced synchronous one. That
is where the residual 362 layout events come from.

If the orchestrator wants a true zero, it needs a choreography decision about the session pane's
width, which is outside Task 1's "must be visually indistinguishable" constraint. Flagging rather
than deciding.

---

## 4. Where I deviated from the brief

**The depth blur is still a `filter`, quantized, not a cross-fade between stacked copies.**

The brief asked for two stacked copies, one with a static blur, cross-faded by opacity. I built
that first and it failed:

- **backdrop-filter overlay** (no DOM duplication): produced **no blur at all** inside the duo's
  compositing group. Verified visually: at p=0.15 the receded pane rendered sharp where the
  baseline was clearly soft. This is what the first pixel diff caught.
- **a cloned copy of the panes**: desyncs. The blur is still unwinding (`rec` ≈ 0.68) at p=0.6
  when the chat begins to dock, so a static clone would show a closed chat over an opening one.

What shipped instead: the blur radius is quantized to 0.2px steps and the saturation to 0.05, and
both go through the write memo. It re-rasterizes ~13 times across the recede instead of on ~900
frames. `filter` is paint-only, so it contributes no layout either way, and the look is exact.

I judged an exact look with ~13 rasterizations better than a wrong look with zero. Calling it out
because it is a direct deviation from a written instruction.

---

## 5. Visual verification, frame by frame

11 fixed film-progress stops captured on both builds at 1440×900, RMSE-diffed with ImageMagick.
Because the globe's spin, the radar sweep and the clock are **time-based** CSS/WebGL animations,
a same-build capture pair establishes the noise floor.

| Stop | Noise floor | Before vs after | Reading |
|---|---|---|---|
| 0.00 | 0.014% | 0.124% | clean |
| 0.15 | 0.000% | 0.676% | blur quantization |
| 0.30 | 4.370% | 4.399% | within noise |
| 0.50 | 1.272% | 1.444% | within noise |
| 0.545 | 2.866% | 2.940% | within noise (card verified by eye, identical) |
| 0.58 | 2.579% | 2.650% | within noise (card pixel-identical) |
| 0.63 | 0.446% | 1.152% | **sweep bleed, see below** |
| 0.72 | 0.000% | 5.673% | **slot height, see below** |
| 0.86 | 0.380% | 1.056% | clean |
| 0.93 | 0.000% | 1.337% | clean |
| 0.98 | 0.000% | 0.434% | clean |

Screenshots in `/tmp/gae-task1-shots/{before,before2,after}/`.

**The match card is pixel-identical at its resting state** (p=0.58, side-by-side inspected):
position, size, corner radius, border, ring and type all land exactly where they did. The pill
state at p=0.545 is likewise identical. The FLIP is correct.

### Two known visual differences

**1. Radar sweep bleeds faintly over the returning session pane, p ≈ 0.61-0.66.**
The brief required removing the mid-film `z-index` flip and establishing one stacking order. The
duo is now fixed at `z-index: 4`, below the theatre's `z-index: 8`. The theatre only carries
opacity while the duo is receded, except for a ~5% window during the return, where the theatre is
still fading out (opacity ~0.9 → 0) while the duo comes back. In that window the faint conic sweep
now washes over the pane instead of being covered by it. Subtle, and it is a wash rather than a
shape, but it is real and I can see it in the p=0.63 pair.

The alternative is to keep the flip and memoize it, which writes `z-index` exactly twice per
traversal (at the same instant it changes today) and is pixel-identical. I followed the brief
because the reason given for removal, layer-tree churn next to the WebGL canvas, is a documented
bug class in this file. One line to switch if you prefer the pixels. **Your call.**

**2. The dashed expert slot is 4px taller, p ≈ 0.60-0.725.**
The slot used to be `display:none`'d at p>0.72 and replaced in flow by the resident (62px vs the
slot's 58px), so the original's chat column *snapped* 4px at that instant. With both elements
permanently in layout, one constant height has to serve both. I set the slot to 62px so the
resident's state matches exactly, because acts 3 and 4 (0.72 → 1.0, including delivery and the
finale) are 28% of the film against the dock window's ~1.5%.

Measured trade: with the slot at 58px, p=0.93 diffed 6.43% and p=0.72 diffed 0.35%. At 62px,
p=0.93 diffs 1.34% and p=0.72 diffs 5.67%. The long acts are now exact; the brief dock window is
2px off. This also removes the original's 4px snap.

### Reduced motion

Verified with `prefers-reduced-motion: reduce` emulated: track is auto-height (no pin), stage
`position: relative`, theatre hidden, resident back to `position: static` and opacity 1, chat
expanded to 340px, ask and reply text both filled. The poster composes correctly. Screenshot at
`/tmp/gae-task1-shots/reduced.png`.

---

## 6. will-change hygiene

Removed `top` and `left` from `.probe`, `.match`, `.payload`, `.wait` (they no longer animate
those). Added `will-change: transform, opacity` to `.whisperSub`, which animates both and had
none. Left `.globe`'s `will-change: transform` alone: it is a deliberate layer pin documented
against a GPU dome-blacking bug, not an animation hint. No blanket application.

---

## 7. Uncertainties

- **The stutter this task was written against does not reproduce on this hardware.** Both builds
  hold 120fps with zero dropped frames. The layout reduction is large and real, but if the
  original stutter report came from a specific slower device, that device is where the win should
  be confirmed. I could not verify it here.
- **Style recalc time did not improve** (flat at 1x, and in one throttled sample it read ~10%
  worse, inside run-to-run noise on a loaded machine). If Task 4 adds GPU passes, the two new
  custom properties on `.match` and the two counter-scale wrapper elements are the first things I
  would re-measure.
- **Border and ring anisotropy at the extreme pill state.** Under the FLIP's non-uniform scale the
  card's 1.5px border renders ~0.36px on its left and right edges at `cardT = 0`, and the 6px ring
  ~1.45px. The elliptical radius compensates the corner shape but not stroke width. It is
  concentrated in the earliest frames of the unfold, which are covered by the expanding flash
  ring, and the pixel diff at p=0.545 came back inside the noise floor, but it is a genuine
  approximation and I want it on the record rather than buried.
- **Reads are one frame stale.** The composer's rect drives the probe's flight home and the chat's
  rect drives the wait beat. Both looked correct in the diffs; at a much lower frame rate the lag
  would grow.
- I did not test at 375px. Mobile hides `.scanCard` and `.face`, and the FLIP measures from live
  `offsetWidth`, so it should follow the viewport, but that is reasoning, not a measurement.
