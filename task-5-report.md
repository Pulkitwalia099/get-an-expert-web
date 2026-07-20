# Task 5: sound layer

Branch: `v2-sound`. Files added: `v2/components/hero/audio.ts`,
`v2/components/hero/SoundToggle.tsx`, `v2/components/hero/SoundToggle.module.css`,
`v2/components/hero/audio.test.ts`. `HeroFilm.tsx` was not touched (see
Integration below).

## Synthesis approach per cue

Everything is Web Audio: oscillators/filtered noise through a `GainNode`
envelope, no audio files. Palette is warm and restrained: sine/triangle
waves through a lowpass, never a raw square/sawtooth. One shared
`ConvolverNode` reverb (impulse response synthesized at runtime from
decaying noise, no asset) gives cues that want it a touch of space.

| Beat | Trigger (film-progress) | Implementation | Why it sounds that way |
|---|---|---|---|
| Probe rise | `PHASES.probeRise[0]` = 0.19 | Sine 220Hz to 311Hz over 0.75s, slow fade in/out, 1.4kHz lowpass | A glide, not a beep - reads as lift |
| City scan tick | 12 thresholds, evenly spaced across `PHASES.scan` (derived, see below) | Triangle 180Hz, 4ms attack, 50ms decay, 900Hz lowpass | Short enough to read as a pulse even several in a row |
| Match holds green | `MATCH_HOLDS_AT` (existing constant, 0.5) | Two sines, C5+E5 major third, 30ms attack, 0.9s decay, 4.2kHz lowpass + reverb send | The one deliberately bright moment; still just two soft sine tones |
| Chat dock | `PHASES.chatDock[1]` = 0.68 (arrival, not the start of the slide) | Sine 300Hz, 2ms attack, 30ms decay, 700Hz lowpass | Damped and short - a settle, not a UI beep |
| Delivery lands | `PHASES.deliver[0] + 0.008` = 0.908 (matches the existing confetti trigger exactly) | Bandpassed noise swell (1.1kHz) + a 165Hz sine underneath, 0.4-0.45s attack, ~0.9s decay, reverb send | Airy noise for "swell," the sine gives it body so it doesn't feel thin |
| Finale | `PHASES.finale[0]` = 0.955 | Two triangle 110Hz oscillators (0 and 3 cents detune) for a faint beating, 0.25s attack, 2.4s decay, 900Hz lowpass + reverb | Long low tail, the detune keeps a static drone from sounding dead |

All six trigger points are **derived from film.ts's existing exports**
(`PHASES`, `MATCH_HOLDS_AT`, `CITIES.length`) - nothing new was added to
`film.ts`, and no timing constant was invented. The city-tick math
(`PHASES.scan[0] + (i / CITIES.length) * (PHASES.scan[1] - PHASES.scan[0])`)
is the exact formula `Globe.tsx` already uses to pick the active city index,
so a tick lands the instant the dome's active dot changes. Chat dock and
delivery were the two judgment calls: dock fires on arrival (`chatDock[1]`)
because a "click" reads as an arrival sound, not a departure sound; delivery
reuses the confetti's own trigger point verbatim so the swell and the burst
land in the same frame.

## Edge-trigger and debounce design

`FilmAudioEngine.update(p)` runs once per frame from wherever `apply(p)`
calls it. It tracks only `prevP` (the previous frame's progress) - no
velocity, no time-based animation state, so it stays a pure function of the
progress sequence, same as the rest of the film's scrub-safety requirement.

- **Edge trigger**: a cue fires only on a forward crossing,
  `prevP < threshold && p >= threshold`. Scrubbing backward through a beat
  never fires it; scrubbing forward into it again later legitimately refires
  it (that's a real re-entry, not a replay).
- **Per-cue debounce**: `MIN_RETRIGGER_SEC = 0.12s` (real AudioContext clock,
  not progress) stops the same cue from refiring faster than that even if
  something pathological crossed its threshold twice in quick succession.
- **Shared tick debounce**: the 12 city-tick thresholds share one gate,
  `TICK_MIN_GAP_SEC = 0.055s`. A big forward jump that crosses several city
  thresholds in a single frame plays one tick, not a stack of them -
  `AudioContext.currentTime` doesn't advance within a single synchronous JS
  call, so the debounce naturally collapses same-frame crossings to one.
- **First-frame baseline**: the very first `update()` call just records
  `prevP` and fires nothing, so a page load that restores mid-film scroll
  position doesn't replay every cue it "skipped."

### Fast-scrub evidence (`v2/components/hero/audio.test.ts`, 6 tests, all passing)

Ran against a minimal fake `AudioContext` (jsdom isn't a project dependency,
so this stubs just enough of `window` + Web Audio for Node) that counts every
oscillator/buffer-source `.start()` call as one "voice."

- **Paced forward pass** (0 to 1 in 999 steps, ~16ms of simulated real time
  between frames): 20 voices total - one for each of the 5 single-point
  cues' oscillators (8 voices: probe 1, match-hold 2, dock 1, deliver 2,
  finale 2) plus 12 city ticks. Every beat fired exactly once, at its
  threshold.
- **Backward scrub** (jump straight from `p=1` to `p=0` in one call, after
  reaching the end): **0 voices**. Confirms nothing replays in reverse.
- **Fast forward flick** (jump straight from `p=0` to `p=1` in one call):
  **9 voices**, not 20 - the 8 single-cue voices still fire (each is a
  distinct, legitimately-crossed beat) but the 12 city ticks collapse into
  **1**, because they all cross within the same synchronous call and share
  one debounce gate. This is the direct evidence against "a burst of
  overlapping tones."
- **Reduced motion**: same paced forward pass with `prefers-reduced-motion`
  mocked true - **0 voices** across the whole pass.
- **Muted by default + persists**: fresh engine reads `isMuted() === true`
  with no stored value; after `toggleMuted()`, `localStorage` holds `"0"`;
  a simulated reload (fresh module graph, same underlying storage) reads
  `isMuted() === false` from it.

I kept the harness as a real test file rather than deleting it - it's the
regression coverage for exactly the property most likely to regress
(scrub safety) if the trigger logic is ever touched.

## Integration API (exact, copy-pasteable)

`filmAudio` is a module-level singleton exported from `audio.ts`. It needs
no props, no context provider, no React state of its own for the film side.

**1. Inside `apply(p)` in `HeroFilm.tsx`**, add one line anywhere after `p`
is known (e.g. right at the top of `apply`):

```ts
import { filmAudio } from "./audio";
// ...
const apply = (p: number) => {
  filmAudio.update(p);
  // ...existing body, unchanged
};
```

**2. Render `<SoundToggle />` once**, as a direct child of the component's
top-level returned element - **not** nested inside `.stage` or any other
element Task 1 puts a per-frame `transform` on:

```tsx
import SoundToggle from "./SoundToggle";
// ...
return (
  <>
    <SoundToggle />
    <section className={styles.track} ref={/* existing ref */}>
      {/* existing film markup, unchanged */}
    </section>
  </>
);
```

`SoundToggle` positions itself with `position: fixed` in the viewport's
bottom-right corner (`SoundToggle.module.css`), `z-index: 70` (above
`.matchOverlay`'s `z-index: 60`, the highest currently in `hero.module.css`).
It reads and calls `filmAudio.isMuted()` / `filmAudio.toggleMuted()`
directly - no props needed. It renders `null` under
`prefers-reduced-motion` (nothing to toggle if nothing plays), and its own
click is what stands up the `AudioContext` if the page-wide first-gesture
listener in `audio.ts` hasn't already fired.

**Why not nest it in `.stage`**: `position: fixed` is positioned relative to
its nearest transformed/filtered ancestor if one exists, not the viewport.
Task 1 is moving most of the film's DOM onto per-frame `transform` writes,
so if `SoundToggle` ends up inside one of those elements, it would jump
around with whatever it's nested in instead of staying pinned to the
corner. Keeping it as a sibling of the animated subtree avoids that
entirely regardless of what Task 1 lands as.

## Non-negotiables checklist

- Muted by default: `readStoredMuted()` defaults to `true` when nothing is
  stored. ✓ (tested)
- Persisted to `localStorage` (`gae:hero-sound-muted`). ✓ (tested)
- `AudioContext` created lazily, only inside a gesture handler
  (`ensureContext()` is private and only called from the gesture listeners
  or `toggleMuted()`, never from the constructor or `update()`). ✓
- No audio under `prefers-reduced-motion` (checked every `update()` call,
  and `SoundToggle` renders nothing). ✓ (tested)
- Edge-triggered, debounced against fast scrubs. ✓ (tested, see above)
- Nothing blocks a frame: `update()` is early-return-heavy (baseline check,
  mute check, context-exists check) before doing any Web Audio work; the
  actual synthesis is a handful of cheap node-creation calls per cue, and
  the DSP itself runs on the audio thread, not the render path.

## Verification

- `npx tsc --noEmit -p tsconfig.json` - clean.
- `cd v2 && npm run build` - passes (Turbopack build, 6 static/dynamic
  routes generated, no errors).
- `npx vitest run` - 17/17 tests pass (6 new in `audio.test.ts`, 11
  pre-existing in `lib/validateSubmission.test.ts`, untouched).
- `npx eslint components/hero/audio.ts components/hero/SoundToggle.tsx
  components/hero/audio.test.ts` - clean, except one
  `react-hooks/set-state-in-effect` warning in `SoundToggle.tsx` for the
  mount-detection `useEffect`. This is the same pattern already used
  identically in `HeroFilm.tsx` (its own `reduced`/`mobile` detection effect
  trips the same rule); I matched the existing codebase convention rather
  than deviate. It doesn't fail `npm run build`.

## Concerns for the orchestrator

1. `SoundToggle`'s fixed bottom-right position hasn't been checked against
   whatever Task 1/Task 4 end up putting in that corner (scroll cue, CTAs,
   etc.) since I couldn't see their landed output. Worth a visual pass once
   all four other tasks are merged.
2. I picked chat-dock-on-arrival and delivery-matches-confetti as the two
   cues without an unambiguous single trigger point in the plan text. Flag
   if either should move.
