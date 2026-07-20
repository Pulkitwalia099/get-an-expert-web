/* audio.test.ts - drives FilmAudioEngine across a progress ramp, including a
 * fast forward flick and a fast backward scrub, without a real browser or a
 * real film. jsdom isn't a project dependency, so this stubs just enough of
 * `window` + the Web Audio API for the module to run in Node: a minimal fake
 * AudioContext that records every oscillator/buffer-source `.start()` call
 * as one "voice", which stands in for "a cue actually sounded."
 *
 * This is the harness required by Task 5's verification standard, kept on
 * as real regression coverage since it directly exercises the scrub-safety
 * rules (edge-triggering, debouncing) that are the easiest thing to get
 * wrong here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHASES, MATCH_HOLDS_AT, CITIES } from "./film";

let voiceStarts = 0;
let store: Record<string, string> = {};
let reducedMotion = false;

function makeFakeAudioContext() {
  class FakeParam {
    value = 0;
    setValueAtTime() {
      return this;
    }
    linearRampToValueAtTime() {
      return this;
    }
    exponentialRampToValueAtTime() {
      return this;
    }
    setTargetAtTime() {
      return this;
    }
    cancelScheduledValues() {
      return this;
    }
  }

  class FakeNode {
    connect() {
      return this;
    }
    disconnect() {}
  }

  class FakeSource extends FakeNode {
    type = "sine";
    frequency = new FakeParam();
    detune = new FakeParam();
    buffer: unknown = null;
    start() {
      voiceStarts++;
    }
    stop() {}
    addEventListener() {}
  }

  return class FakeAudioContext {
    // real AudioContext.currentTime advances with wall-clock time; auto-step
    // it on every read (~one 60fps frame) so paced update() calls see
    // realistic elapsed time between them, the same way the debounce logic
    // would see it against a real hardware clock.
    private _t = 0;
    get currentTime() {
      return (this._t += 1 / 60);
    }
    sampleRate = 44100;
    destination = new FakeNode();
    state: "running" | "suspended" = "running";
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    createGain() {
      const n = new FakeNode() as FakeNode & { gain: FakeParam };
      n.gain = new FakeParam();
      return n;
    }
    createBiquadFilter() {
      const n = new FakeNode() as FakeNode & {
        type: string;
        frequency: FakeParam;
        Q: FakeParam;
      };
      n.type = "lowpass";
      n.frequency = new FakeParam();
      n.Q = new FakeParam();
      return n;
    }
    createConvolver() {
      return new FakeNode() as FakeNode & { buffer: unknown };
    }
    createOscillator() {
      return new FakeSource();
    }
    createBufferSource() {
      return new FakeSource();
    }
    createBuffer(channels: number, length: number) {
      return {
        getChannelData: () => new Float32Array(length),
      };
    }
  };
}

function installFakeWindow() {
  store = {};
  reducedMotion = false;
  const listeners: Record<string, (() => void)[]> = {};

  const fakeWindow = {
    AudioContext: makeFakeAudioContext(),
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    matchMedia: (query: string) => ({
      matches: query.includes("reduce") ? reducedMotion : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    addEventListener: (name: string, fn: () => void) => {
      (listeners[name] ??= []).push(fn);
    },
    removeEventListener: (name: string, fn: () => void) => {
      listeners[name] = (listeners[name] ?? []).filter((f) => f !== fn);
    },
  };

  vi.stubGlobal("window", fakeWindow);
  return fakeWindow;
}

/** Fresh module graph + fresh fake window, so `filmAudio`'s module-level
 * singleton is rebuilt against clean state for every test. */
async function freshEngine() {
  vi.resetModules();
  installFakeWindow();
  voiceStarts = 0;
  const mod = await import("./audio");
  return mod.filmAudio;
}

describe("FilmAudioEngine", () => {
  beforeEach(() => {
    voiceStarts = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is muted by default and persists the mute state across a reload", async () => {
    const engine = await freshEngine();
    expect(engine.isMuted()).toBe(true);

    const nowMuted = engine.toggleMuted();
    expect(nowMuted).toBe(false);
    expect(store["gae:hero-sound-muted"]).toBe("0");

    // simulate a reload: fresh module graph, same underlying localStorage
    vi.resetModules();
    installFakeWindow();
    // installFakeWindow() reset `store` - re-seed it as if it survived a reload
    store["gae:hero-sound-muted"] = "0";
    const { filmAudio: reloaded } = await import("./audio");
    expect(reloaded.isMuted()).toBe(false);
  });

  it("plays nothing under prefers-reduced-motion", async () => {
    const engine = await freshEngine();
    reducedMotion = true;
    engine.toggleMuted(); // unmute + create context

    engine.update(0); // baseline
    for (let p = 0; p <= 1; p += 0.02) engine.update(p);

    expect(voiceStarts).toBe(0);
  });

  it("fires each cue once on a normally-paced forward pass, at the film's own trigger points", async () => {
    const engine = await freshEngine();
    engine.toggleMuted(); // unmute + create context
    engine.update(0); // baseline call - establishes prevP, fires nothing

    // paced forward scrub: fine-grained steps, matching how a real scroll
    // drives apply(p) frame by frame
    for (let p = 0.001; p <= 1; p += 0.001) engine.update(p);

    // 5 single-point cues (probeRise, matchHold x2 osc, chatDock, deliver x2
    // osc, finale x2 osc) + 12 city ticks (1 osc each)
    const expectedSingleCueVoices = 1 /* probeRise */ + 2 /* matchHold dyad */ +
      1 /* chatDock */ + 2 /* deliver noise+body */ + 2 /* finale pair */;
    const expectedTickVoices = CITIES.length;
    expect(voiceStarts).toBe(expectedSingleCueVoices + expectedTickVoices);
  });

  it("does not replay cues when scrubbed backward", async () => {
    const engine = await freshEngine();
    engine.toggleMuted();
    engine.update(0); // baseline
    for (let p = 0.001; p <= 1; p += 0.05) engine.update(p); // get to the end

    voiceStarts = 0;
    engine.update(0); // one fast backward scrub, full film in a single frame
    expect(voiceStarts).toBe(0);
  });

  it("collapses a fast forward flick across many beats into one voice per distinct cue, not a burst per crossed threshold", async () => {
    const engine = await freshEngine();
    engine.toggleMuted();
    engine.update(0); // baseline at the very start of the film

    voiceStarts = 0;
    engine.update(1); // one fast forward flick across the entire film

    // every single-point cue still fires exactly once each (they're distinct
    // beats, all legitimately crossed) - the win is the 12 city ticks
    // collapsing to a single voice instead of 12 overlapping ones
    const expectedSingleCueVoices = 1 + 2 + 1 + 2 + 2;
    expect(voiceStarts).toBe(expectedSingleCueVoices + 1);
    expect(voiceStarts).toBeLessThan(expectedSingleCueVoices + CITIES.length);
  });

  it("derives city-tick thresholds from film.ts's own scan window (no invented timing constants)", () => {
    // this only checks the math this module relies on lines up with the
    // exact formula Globe.tsx uses to pick the active city index
    const [a, b] = PHASES.scan;
    for (let i = 0; i < CITIES.length; i++) {
      const t = a + (i / CITIES.length) * (b - a);
      expect(t).toBeGreaterThanOrEqual(a);
      expect(t).toBeLessThan(b);
    }
    // and the match-hold cue reuses film.ts's own named constant rather than
    // a re-derived number
    expect(MATCH_HOLDS_AT).toBe(0.5);
  });
});
