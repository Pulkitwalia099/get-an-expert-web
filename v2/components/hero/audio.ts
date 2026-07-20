/* audio.ts - the hero film's sound layer.
 *
 * Every cue is synthesized with the Web Audio API, not loaded from a file:
 * no sourcing, no licensing, zero bundle cost, and every cue is tunable as
 * code. This module owns a single `FilmAudioEngine` singleton (`filmAudio`,
 * exported below) that both the film's per-frame driver and the mute toggle
 * talk to, so they always agree on one AudioContext and one mute state.
 *
 * See docs/hero-motion-plan.md, Task 5, for the six-cue table and rules this
 * file implements. Cue trigger points are derived from film.ts's own PHASES
 * and CITIES rather than re-declared, so a retune of the choreography never
 * has to be mirrored here by hand.
 *
 * Integration: see the block comment at the bottom of this file.
 */

import { CITIES, MATCH_HOLDS_AT, PHASES } from "./film";

const STORAGE_KEY = "gae:hero-sound-muted";

// a cue can't refire faster than this (real seconds, AudioContext clock) -
// this is what keeps a violent scrub from firing a single beat repeatedly
const MIN_RETRIGGER_SEC = 0.12;
// city ticks share one debounce across all twelve, so a fast scan-window
// leap plays one soft pulse instead of a burst of twelve
const TICK_MIN_GAP_SEC = 0.055;

// ---- cue trigger points, derived from film.ts -----------------------------
// one threshold per city, evenly spaced across the scan window - mirrors the
// exact math Globe.tsx uses to pick the active city index (see PHASES.scan +
// CITIES.length there), so a tick lands the instant the dome's active dot
// changes.
const CITY_TICKS: number[] = CITIES.map((_, i) => {
  const t = i / CITIES.length;
  return PHASES.scan[0] + t * (PHASES.scan[1] - PHASES.scan[0]);
});

const PROBE_RISE_AT = PHASES.probeRise[0];
// the globe dot holds green a hair before the DOM card resolves - this is
// the "match holds" instant, not the card's own resolve window
const MATCH_HOLD_AT = MATCH_HOLDS_AT;
// the click fires on arrival (dock complete), not on the start of the slide
const CHAT_DOCK_AT = PHASES.chatDock[1];
// mirrors HeroFilm's own confetti trigger (`p > PHASES.deliver[0] + 0.008`)
// exactly, so the swell and the burst land in the same frame
const DELIVER_AT = PHASES.deliver[0] + 0.008;
const FINALE_AT = PHASES.finale[0];

type CueKey = "probeRise" | "matchHold" | "chatDock" | "deliver" | "finale";

function readStoredMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "1"; // muted by default
  } catch {
    return true; // storage blocked (private browsing, etc) - default safe
  }
}

function writeStoredMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore - nothing we can do if storage is unavailable */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Synthesizes a short impulse response (exponential-decay filtered noise)
 * so cues can get a touch of warm space without shipping an audio file. */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

class FilmAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbSend: GainNode | null = null;

  private muted = readStoredMuted();
  private prevP: number | null = null;
  private lastFired: Partial<Record<CueKey, number>> = {};
  private lastTickAt = -Infinity;
  private gestureListenersAttached = false;

  constructor() {
    this.attachGestureListeners();
  }

  /** Web Audio requires a user gesture before it will produce sound. Rather
   * than gate on the toggle alone, listen once for the first qualifying
   * gesture anywhere on the page, so a returning visitor who left the sound
   * on last time gets it back the moment they start interacting - still
   * gesture-gated, never on mount. */
  private attachGestureListeners() {
    if (this.gestureListenersAttached || typeof window === "undefined") return;
    this.gestureListenersAttached = true;
    const onGesture = () => {
      this.ensureContext();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchend", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchend", onGesture, { passive: true });
  }

  /** Lazily builds the AudioContext + master chain. Only ever called from
   * inside a gesture handler (the listeners above, or SoundToggle's click) -
   * never from the constructor and never from update(). */
  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    if (typeof window === "undefined") return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);

    // one shared reverb send every cue can dip into for a touch of warmth -
    // subtle by design, see each cue's wet level below
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 1.6, 2.2);
    reverb.connect(master);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(reverb);

    this.ctx = ctx;
    this.master = master;
    this.reverbSend = reverbSend;
    return ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Flips mute, persists it, and updates the master gain with a short
   * click-free ramp. Called by SoundToggle - this click is itself a valid
   * gesture, so it can also stand up the context if the passive listeners
   * above haven't fired yet. */
  toggleMuted(): boolean {
    this.muted = !this.muted;
    writeStoredMuted(this.muted);
    const ctx = this.ensureContext();
    if (ctx && this.master) {
      const now = ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.015);
    }
    return this.muted;
  }

  /** Called once per rAF frame from the film's apply(p) with the current
   * film-progress value (0..1, scrubbed in both directions). Cheap no-op
   * whenever there is nothing to do, so it never costs a frame. */
  update(p: number) {
    // establish a baseline on the very first call so a page load that
    // restores mid-film scroll position doesn't fire every cue it skipped
    if (this.prevP === null) {
      this.prevP = p;
      return;
    }
    const prev = this.prevP;
    this.prevP = p;

    if (this.muted || !this.ctx || prefersReducedMotion()) return;

    const crossed = (t: number) => prev < t && p >= t;
    const now = this.ctx.currentTime;

    if (crossed(PROBE_RISE_AT) && this.canFire("probeRise", now)) this.playProbeRise();
    if (crossed(MATCH_HOLD_AT) && this.canFire("matchHold", now)) this.playMatchHold();
    if (crossed(CHAT_DOCK_AT) && this.canFire("chatDock", now)) this.playChatDock();
    if (crossed(DELIVER_AT) && this.canFire("deliver", now)) this.playDeliver();
    if (crossed(FINALE_AT) && this.canFire("finale", now)) this.playFinale();

    // city ticks: many thresholds, one shared debounce, so a fast forward
    // leap across several cities in one frame plays a single soft pulse
    // rather than stacking every skipped tick on top of each other
    if (now - this.lastTickAt >= TICK_MIN_GAP_SEC) {
      for (const t of CITY_TICKS) {
        if (crossed(t)) {
          this.lastTickAt = now;
          this.playCityTick();
          break;
        }
      }
    }
  }

  private canFire(key: CueKey, now: number): boolean {
    const last = this.lastFired[key] ?? -Infinity;
    if (now - last < MIN_RETRIGGER_SEC) return false;
    this.lastFired[key] = now;
    return true;
  }

  // ---- envelope helper ----------------------------------------------------

  /** Ramps `gain` 0 -> peak over `attack` seconds, holds, then settles back
   * to 0 with a natural decay curve. All click-free (no instant jumps). */
  private envelope(
    gain: GainNode,
    peak: number,
    attack: number,
    release: number,
    startTime: number,
    hold = 0
  ) {
    const g = gain.gain;
    g.cancelScheduledValues(startTime);
    g.setValueAtTime(0.0001, startTime);
    g.linearRampToValueAtTime(peak, startTime + attack);
    g.setTargetAtTime(0.0001, startTime + attack + hold, Math.max(release, 0.01) / 3);
  }

  /** Schedules `node` to stop and disconnect once it's safely inaudible. */
  private cleanupAfter(node: AudioScheduledSourceNode, seconds: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    node.stop(ctx.currentTime + seconds);
    node.addEventListener("ended", () => node.disconnect());
  }

  // ---- cue synthesis --------------------------------------------------------
  // Warm and restrained by design: sine/triangle tones through a lowpass,
  // never a raw square/sawtooth, and only the match-hold cue is allowed to
  // read as bright. Every cue is its own tiny, self-disconnecting instrument.

  /** Probe rise - soft rising tone, quiet. A sine gliding up just over half
   * an octave with a slow fade in/out, so it reads as a lift, not a beep. */
  private playProbeRise() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(311, t0 + 0.75);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;

    const gain = ctx.createGain();
    this.envelope(gain, 0.05, 0.12, 0.7, t0, 0.1);

    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t0);
    this.cleanupAfter(osc, 1.0);
  }

  /** City scan tick - short low pulse, one per city. A brief filtered blip,
   * fast attack and fast decay, quiet enough to read as a heartbeat rather
   * than a beep even when several land close together. */
  private playCityTick() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    this.envelope(gain, 0.055, 0.004, 0.05, t0);

    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t0);
    this.cleanupAfter(osc, 0.09);
  }

  /** Match holds green - clear resolve tone, the only bright moment. A
   * warm major-third dyad (sine + sine a third up) with a light shimmer of
   * reverb - restrained, but unmistakably the peak of the film. */
  private playMatchHold() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbSend) return;
    const t0 = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 4200;
    filter.connect(this.master);
    filter.connect(this.reverbSend);

    const notes = [523.25, 659.25]; // C5, E5 - a bright but simple major third
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      this.envelope(gain, i === 0 ? 0.09 : 0.06, 0.03, 0.9, t0, 0.05);
      osc.connect(gain).connect(filter);
      osc.start(t0);
      this.cleanupAfter(osc, 1.3);
    });
  }

  /** Chat dock - muted click. A very short, heavily filtered low blip: a
   * damped mechanical settle, not a UI beep. */
  private playChatDock() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 300;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;

    const gain = ctx.createGain();
    this.envelope(gain, 0.06, 0.002, 0.03, t0);

    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t0);
    this.cleanupAfter(osc, 0.06);
  }

  /** Delivery lands - airy swell. Filtered noise swelling up and settling,
   * with a soft low sine underneath for body and a little reverb for air. */
  private playDeliver() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbSend) return;
    const t0 = ctx.currentTime;

    const noiseBuf = makeImpulse(ctx, 1.2, 0.4); // reuse the noise generator as raw source material
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1100;
    bandpass.Q.value = 0.7;

    const noiseGain = ctx.createGain();
    this.envelope(noiseGain, 0.045, 0.45, 0.9, t0, 0.05);

    noise.connect(bandpass).connect(noiseGain);
    noiseGain.connect(this.master);
    noiseGain.connect(this.reverbSend);

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.value = 165;
    const bodyGain = ctx.createGain();
    this.envelope(bodyGain, 0.035, 0.4, 0.8, t0, 0.05);
    body.connect(bodyGain).connect(this.master);

    noise.start(t0);
    body.start(t0);
    this.cleanupAfter(noise, 1.4);
    this.cleanupAfter(body, 1.4);
  }

  /** Finale - low tail that fades out. A low drone with a second, gently
   * detuned oscillator for warmth, a slow attack and a long settle. */
  private playFinale() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbSend) return;
    const t0 = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(this.master);
    filter.connect(this.reverbSend);

    const detunes = [0, 3]; // cents - a faint beating, not a chorus effect
    detunes.forEach((cents, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 110; // A2
      osc.detune.value = cents;
      const gain = ctx.createGain();
      this.envelope(gain, i === 0 ? 0.06 : 0.04, 0.25, 2.4, t0, 0.2);
      osc.connect(gain).connect(filter);
      osc.start(t0);
      this.cleanupAfter(osc, 3.2);
    });
  }
}

/** Singleton shared by the film's per-frame driver and the mute toggle, so
 * both always agree on one AudioContext and one mute state. */
export const filmAudio = new FilmAudioEngine();

/* -----------------------------------------------------------------------
 * INTEGRATION (for the orchestrator wiring this into HeroFilm.tsx)
 * -----------------------------------------------------------------------
 * 1. Inside apply(p), anywhere after `p` is known, add:
 *
 *      filmAudio.update(p);
 *
 * 2. Render <SoundToggle /> once, as a sibling that sits OUTSIDE any
 *    per-frame-transformed element (see SoundToggle.tsx's own comment for
 *    why - it uses position: fixed and needs an untransformed containing
 *    block). A direct child of the component's top-level returned element
 *    is the safe spot.
 *
 * That's the whole integration. filmAudio is a module singleton: no props,
 * no context provider, no extra wiring. It is entirely inert until a user
 * gesture occurs (per the "never on mount" rule) and entirely silent under
 * prefers-reduced-motion or while muted.
 * ----------------------------------------------------------------------- */
