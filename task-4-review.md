# Task 4 review: render pipeline (branch `v2-render`)

Two verdicts: **spec compliance FAIL** (two of four effects not delivered as written, both
deliberate, one correctly so). **Code quality NOT APPROVED** (one real visual defect, one
inverted effect, plus unreproducible measurements).

Reviewed against `docs/hero-motion-plan.md` global constraints + Task 4, `task-4-report.md`,
and `.superpowers/sdd/review-task4.diff`. Build run and confirmed passing.

---

## Constraint check

| Constraint | Result |
|---|---|
| File boundary (`Globe.tsx` only) | **PASS**, verified. `git diff --stat f1392d0^..HEAD` touches only `Globe.tsx`, `task-4-report.md`, and four stills. No edit to `HeroFilm.tsx`, `hero.module.css`, or `film.ts`. |
| Choreography unchanged | **PASS**. No `film.ts` edit. All new logic reads `PHASES`/`MATCH_HOLDS_AT`, never redefines them. One new constant set added alongside (`APERTURE`, `MAX_COC`, `SHUTTER`, `MAX_STREAK_PX`). |
| Bloom unchanged | **PASS**, verified in diff, not just claimed. See below. |
| Design tokens, no raw hex | **PASS**. No colour literal added. New constants are numeric tuning scalars, not colours. |
| Reduced motion | **PASS with a gap**, see Minor 6. |
| Mobile no regression | **PASS on the 16.7ms budget**; see Important 5 on the reported delta. |
| Build / TypeScript | **PASS**, I ran `npm run build`: compiled in 1.8s, TypeScript clean, 6/6 static pages. |

### Bloom is genuinely untouched

Confirmed against the diff, not the report's word for it. The old JSX:

```
intensity={0.75} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur radius={0.5}
```

and the new constant:

```
const BLOOM = { intensity: 0.75, luminanceThreshold: 0.5,
                luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.5 } as const;
```

Verbatim, including bare `mipmapBlur` correctly becoming `true`. Spread as `<Bloom {...BLOOM} />`.
Bloom's *parameters* are untouched. Bloom's *input* is not, and that is not the same claim, see
Minor 7.

---

## (a) Adjudication: the grain pass was not shipped

**Verdict: the technical reasoning is sound and the decision is correct. The requirement is
nonetheless unmet, and the stated cost justification is factually wrong.**

Where the implementer is right:

- The canvas is `alpha: true` and inset into `.theatre`. A `postprocessing` effect preserves
  input alpha unless it deliberately writes alpha. Between the dots the alpha is 0, so no RGB
  the noise effect produces can become visible there. Grain lands on the dots and nowhere else.
  This is correct as stated.
- The follow-on judgement is the more valuable one and is also correct: because the canvas
  covers only `.theatre` and not the stage, removing `.stage::after` would leave the rest of the
  stage ungrained. **"Make no CSS change" is the right instruction to the orchestrator.** Had it
  shipped the pass and told the orchestrator to strip the CSS overlay, that would have been a
  visible regression across the whole stage. Good catch, correctly escalated to the file owner.
- Commit history corroborates that the pass was actually built (`0c71ba7`) and then removed
  (`a493128`), so this is a measured deviation and not a skipped item dressed up after the fact.

Where it is wrong or thin:

1. **"Costing a full `EffectPass` for no picture" is not true.** I read
   `node_modules/@react-three/postprocessing/dist/index.js`. The composer walks its r3f children
   and coalesces *adjacent effects that do not require the depth attribute* into a single
   `EffectPass`:

   ```
   const $ = new Ve(u, ...q)   // q accumulates consecutive non-depth effects
   ```

   `NoiseEffect` needs no depth, so it would have merged into the same `EffectPass` as Bloom and
   the vignette. The real cost was a few ALU ops inside an already-existing merged fragment
   shader, not a pass. The conclusion (remove it) survives, because a few ALU ops for zero
   picture is still worth removing. But the premise that carried the argument is incorrect, and
   the same fact should temper how the vignette's cost is described.
2. **The evidence is asserted, not attached.** The report says it forced opacity to 1.0 and
   photographed the result. That photograph is not in the diff; the four attached stills are all
   final-state. The plan's Verification standard asks for the evidence, and for the one bullet
   that was deliberately dropped it is the evidence that matters most.

**Disposition.** Accept the deviation. Do not let it close the bullet. The plan's actual goal,
grain that reads as part of the picture rather than a filter laid over it, is still unachieved,
and the implementer has correctly identified that it can only be achieved in `hero.module.css`
by moving grain beneath the theatre in the z-order. That needs to become an explicit follow-up
item owned by the `hero.module.css` agent, not a paragraph in a report that gets filed.

## (b) Adjudication: depth of field in the point shader, not a DepthOfField pass

**Verdict: reasoning holds, and the in-shader approach is a legitimate, arguably better
satisfaction of the requirement. PASS.**

- The premise is correct. The dot field, rim shell and arc all draw with `depthWrite: false`,
  so only the 12 city spheres populate the depth buffer. `DepthOfFieldEffect` derives circle of
  confusion from that buffer; reading the far plane nearly everywhere yields maximum CoC
  everywhere and a uniformly mush dome. The described failure is what would actually happen.
- The workarounds are worse. Enabling `depthWrite` on an additively-blended point cloud breaks
  the blend order it depends on; a depth prepass costs more than the effect is worth here.
- The plan says "Add depth of field so the globe has a focal plane." It does not mandate the
  pass; `DepthOfField` appears only in the Problem paragraph enumerating what the composer
  currently lacks. The requirement is about the focal plane doing narrative work, and it does.
- Per-point bokeh spread is physically what a lens does to a point light, and it is a better
  result than a screen-space gather would give on a field of discrete dots.
- The collapse claim checks out by reading. With `uAperture = 0` and `uRotVel = 0`: `coc = 0`,
  `cocNorm = 0`, `disc = base`, `streak = 0`, `size = base`, so `vRad = 0.42`, `vSoft = 0.08`,
  `vDim = 1`, `vStreak = 0`. The fragment shader's capsule degenerates to `length(c)` and the
  mask reduces to `smoothstep(0.5, 0.34, d)`. The mobile path is a true no-op, not a cheap
  variant. That is a real engineering property and it is stated accurately.

The narrative behaviour also matches the brief: racks onto the active scan city over the first
35% of each slot, settles on the held dot from `MATCH_HOLDS_AT`. Confirmed at `Globe.tsx:425-439`.

---

## Motion blur: scrub-safety analysis

This was the thing most likely to hide an accumulator. **It does not have one, and the direction-
change argument is correct. But it is a literal dependence on the previous frame, and the report
does not surface the one case where that shows.**

```
Globe.tsx:456   const dRot = prevRotRef.current === null ? 0
                             : group.rotation.y - prevRotRef.current;
Globe.tsx:458   prevRotRef.current = group.rotation.y;
Globe.tsx:459   const rotVel = mobile || reduced ? 0 : dRot * SHUTTER;
```

Verified properties:

- **Ordering is correct.** Rotation is applied at `:354-380`, the delta is read at `:456`. So
  `dRot` is this frame's actual applied change, not a stale one.
- **Nothing accumulates.** `prevRotRef` is overwritten every frame, never summed. Contrast
  `driftRef.current += delta * SLOW` at `:379`, which is a genuine accumulator and is
  pre-existing.
- **No feedback into geometry.** `uRotVel` reaches only `gl_PointSize`, `vStreak` and `vDim`. Dot
  positions are untouched, so the film's geometry retraces regardless of the smear.
- **Direction change is safe.** The capsule is centred on the dot: `t = clamp(dot(c, dir), -h, h)`
  is symmetric in `dir`, so flipping the sign of the velocity draws the identical shape. The
  report's claim is correct.
- **Scrub to an arbitrary point with no history is bounded.** A discontinuous jump makes `dRot`
  large for exactly one frame, but `streak = min(length(dPix), uMaxStreak)` caps it at 12 device
  pixels and it clears on the next frame. Bounded and transient. `MAX_STREAK_PX` is the correct
  mitigation and the code comment says so.

The rejection of the analytic derivative is **correct and well-argued**, and worth endorsing: the
globe's rotation has genuine wall-clock terms (`delta * SPIN` at `:360`, `delta * SLOW` at `:379`)
that a d/d(progress) form cannot see at all, while `rotRef = lerp(from, to, holdT)` gives a large
derivative across the whole hold. Parking mid-hold would smear permanently with nothing moving.
That is the right call, made on evidence.

**Where it does deviate:** the constraint says "no dependence on previous frames." This is one.
The defensible reading is that a motion blur that is a pure function of progress is a
contradiction in terms here, because the subject's motion is partly wall-clock. I accept the
deviation. But it should be recorded as an accepted deviation rather than argued away, because
the frame at a given progress is not byte-identical forwards vs backwards — the report's own
scrub-retrace section already concedes 11.25% vs a 6.7% baseline.

Note the effect self-gates on slow beats without an explicit gate: at `SPIN = 0.21 rad/s` and
60fps, `dRot` is about 0.0035 rad, which works out to roughly a 1px streak after `SHUTTER`.
Effectively free during the free spin. The plan's "off during slow beats" is satisfied by
construction. That is fine, but it is luck of the constants rather than a designed gate, and a
future change to `SPIN` would silently turn on a permanent smear.

**Unmet as written:** the plan names probe flight and match fly as the fast beats. Both are DOM
elements in `HeroFilm.tsx`. The implementer is right that the globe's composer cannot touch them
and right that it is outside the file boundary. But the bullet as written is not delivered; what
shipped is blur on a different subject. This needs the same follow-up treatment as grain.

---

## Findings

### Critical

None. The file boundary held, bloom is untouched, the build passes.

### Important

**1. Focus pops discontinuously when a racked-to city crosses the terminator.**
`v2/components/hero/Globe.tsx:417-423`

```
const FRONT_Z = R - CAM_Z;                       // R = 2.0, CAM_Z = 6.2  ->  -4.2
const viewZ = (mesh) => {
  if (!mesh) return FRONT_Z;
  mesh.getWorldPosition(focusScratch);
  if (focusScratch.z <= 0.05) return FRONT_Z;    // <-- hard step
  return focusScratch.applyMatrix4(camera.matrixWorldInverse).z;
};
```

A city sitting just in front of the terminator (`z = 0.06`) has view z of about `-6.14`. The
moment it crosses to `z <= 0.05` the function returns `-4.2` instead. `focusZ` jumps ~1.94 world
units in a single frame. Since `coc = clamp(abs(mv.z - uFocusZ) * uAperture, 0, uMaxCoc)` with
`APERTURE = 0.38`, every dot in the field shifts CoC by up to 0.74, which is 62% of `MAX_COC`.

Failure scenario: during the scan window (0.26 to 0.52) the globe is free-spinning at
`SPIN = 0.21 rad/s` (`:358-364`), so cities cross the terminator continuously. When the active or
previous rack target crosses, the entire dome's blur level snaps in one frame. Reads as a focus
pop, and it will fire repeatedly through the scan.

This is a regression introduced by the fix in `f5e8bd3`. That fix correctly stopped focus racking
behind the dome, but replaced a constant-softness bug with an intermittent pop, and the report
does not mention the trade. Wants a smooth term rather than a hard step, for example easing
toward `FRONT_Z` across a band around `z = 0.05` instead of switching at it.

**2. The vignette is strongest exactly where it works against the scene.**
`v2/components/hero/Globe.tsx:475`

```
vignette.darkness = lerp(0.42, 0.26, grade);
```

At `grade = 0` (day) the dome dots are `palette.ink`, dark dots on a cream page (visible in
`docs/task-4-stills/final-p0.53.png`). A vignette multiplies RGB toward black. Darkening a dark
dot on a light ground *increases* peripheral contrast, which is the opposite of the plan's stated
intent, "hold attention centre-frame". At `grade = 1` (dusk) the dots grade to `palette.paper`,
light on a dark room, which is the configuration where a vignette actually recedes the periphery
— and that is precisely where the code makes it weakest.

The ramp is backwards relative to its own rationale. The comment justifies easing off at dusk to
avoid "double-darkening the room", but the vignette cannot darken the room: it only touches
pixels the canvas drew, which is the same alpha argument used to delete the grain pass. What it
darkens is dots, and dots are the thing that goes light at dusk.

Failure scenario: through the day-graded majority of the film the vignette makes edge dots
crisper against the cream rather than softer, subtly fighting the depth-of-field falloff that
Task 4 added to do the same job properly.

Also worth a look on strength: `offset: 0.3` starts the falloff closer to centre than
`postprocessing`'s 0.5 default, and `darkness: 0.42` is near the 0.5 default. Against a plan
bullet that says "Subtle. If it is noticeable as a vignette it is too strong," this is tuned more
aggressively than default, not less.

**3. The desktop headroom claim does not carry the caveat the report correctly applied to mobile.**
`task-4-report.md:117-135`

Desktop median 2.8 -> 4.2-4.9ms (+50% to +75%). Desktop p95 3.5-4.4 -> 6.9-9.0ms, roughly
doubled. The report concludes "Nothing exceeds the 16.7ms budget in any configuration."

That is true on the measured machine and only there. The report is admirably explicit that "a
375px viewport on an M4 is not a phone", then does not apply the identical logic to desktop. The
added cost is sprite fill, stated as such in the code comment at `:265-274`, and fill scales with
GPU fill rate and with dpr squared. A p95 of 9.0ms on an M4 leaves 7.7ms of margin on close to
the fastest integrated GPU shipping. An older Intel integrated part at 3x slower on fill-bound
work lands around 27ms, well past budget. The honesty applied to the mobile section needs to
extend to the desktop conclusion.

The measurement *method* is better than average and I want to credit it: parking the film with
`frameloop="always"` and vsync disabled genuinely isolates render-bound cost, and discarding the
earlier harness whose 8ms sleep produced a bogus flat 8.3ms for both arms is exactly the right
instinct. Medians of 280 frames is an adequate sample. The method supports the *relative* delta
it reports. It does not support a claim about absolute smoothness on hardware other than an M4,
and only the mobile half of the report says so.

**4. The perf harness does not exist, so no number here is reproducible.**
`task-4-report.md:115` cites `scratchpad/perf.mjs`. There is no `scratchpad/` directory in the
repo and no `perf.mjs` anywhere in the tree. The plan's Verification standard exists to make
numbers checkable; as shipped they have to be taken on trust. The harness should be committed,
or the numbers should be labelled as unreproducible.

**5. The mobile delta is inside the noise band the report itself declares unresolvable.**
`task-4-report.md:119-123` reports mobile 1.7-2.0 before and 2.3-2.4 after, attributing +0.4ms to
the vignette. `task-4-report.md:185-188` states that mobile depth-of-field cost "sat inside
run-to-run noise (1.7-2.3ms with, 1.7-2.2ms without), so the measurement could not clear it".
Those two statements are inconsistent: a +0.4ms effect is being read as real from the same
instrument that is simultaneously described as unable to resolve a difference of that size. Given
finding 1 above (the vignette merges into the existing `EffectPass` and adds only ALU), +0.4ms is
also higher than the mechanism predicts. Either the mobile numbers are noise, or something other
than the vignette is being measured.

### Minor

**6. `uAperture` is not gated on `reduced`, though `uRotVel` is.**
`Globe.tsx:459` gates smear on `mobile || reduced`. `Globe.tsx:465` gates aperture on `mobile`
only. Under `prefers-reduced-motion`, `p = staticProgress` (default 0.55), so
`easeIO(seg(p, PHASES.theatre[0], 0.3))` saturates and reduced-motion users get the finished
frame at full aperture with a defocused dot field. Not a constraint violation, since constraint 5
is about motion and pinning and depth of field is a static look. But it silently changes what
reduced-motion users see, the report does not mention it, and no reduced-motion still was
attached. The asymmetry with the line six above it also reads as unconsidered rather than chosen.

**7. Bloom character was verified at the one point where the change is a mathematical no-op.**
`task-4-report.md:169-170` verifies bloom by crop comparison at p0.53 on the held match dot. At
p0.53 the held dot *is* the focal target, so its CoC is zero, `vDim` is 1, and the shader output
there is provably identical. It is the least sensitive sample available. The interesting question
is whether `vDim` dimming pushes defocused dots below `luminanceThreshold: 0.5` and changes what
blooms in the field, and that is not tested. The report's own phrasing concedes the field "gains
bokeh". Parameters are untouched, confirmed; whole-frame bloom character is not established.

**8. No action needed: the `<primitive>` vignette mount is correct and idiomatic.**
`Globe.tsx:452-460` justifies bypassing the `<Vignette>` wrapper because it memoizes on
`JSON.stringify(props)`. I checked: the wrapper factory `P(e, t)` does use
`useMemo(..., [JSON.stringify(a)])`, so the stated circular-structure failure is real. And the
composer collects `<primitive>` children correctly, since it tests `N instanceof Effect` over its
r3f children. The library's own `DepthOfField` mounts the same way. Flagging only to confirm the
comment's reasoning was checked rather than trusted.

---

## Summary of what the orchestrator needs to decide

1. Accept or reject the grain deviation. Recommend **accept**, and open a follow-up on the
   `hero.module.css` owner for grain beneath the theatre in the z-order. Do not let the report's
   paragraph substitute for a tracked item. **Make no CSS change**, that instruction is correct.
2. Accept or reject motion blur landing on the dot field rather than the named beats. Recommend
   **accept for this file**, and open a DOM-side follow-up for probe flight and match fly.
3. Findings 1 and 2 are code defects and should be fixed before this merges.
4. Findings 3, 4, 5 are report and methodology corrections, not code changes.
