/* film.ts - the single source of truth for the hero film's choreography.
 *
 * These numbers come straight from the Pulkit-approved "The Wall" prototype
 * (docs/hero-film-v2-spec.html). Every phase boundary lives in "film progress"
 * space (0 -> 1 across the whole four-act film). Both the DOM timeline
 * (HeroFilm) and the R3F globe (Globe) read from here so the search theatre and
 * the globe stay in lockstep.
 *
 * The film restructured to "The Wall": you open INSIDE a Claude Code session,
 * hit a wall, the session recedes in depth while the search theatre plays, the
 * match emerges from the held globe dot, the session returns and the expert
 * chat docks to its right, then delivery lands and the finale closes.
 */

export const ASK = "Get an expert to build the launch video";

/* the 12 cities the dot-globe scans; Barcelona (index 0) is the one that holds
   green as the match. The searchline names the active city as the scan sweeps. */
export const CITIES = [
  "Barcelona",
  "Lagos",
  "Tokyo",
  "Berlin",
  "São Paulo",
  "Toronto",
  "Seoul",
  "Warsaw",
  "Nairobi",
  "Sydney",
  "Austin",
  "Lisbon",
];

/* Sticky-stage pin length, in vh. The spec runs the four-act film across a
   760vh track so every beat breathes. */
export const TRACK_VH = 760;

/* Kept for API stability: the whole scroll maps film progress 0 -> 1. */
export const ACT2_END = 1;

/* Phase boundaries in film-progress space, verbatim from the prototype's P map.
   Windows named here are the reusable ones; a few one-off segs are inlined at
   their call site in HeroFilm so the port stays faithful to the spec. */
export const PHASES = {
  headOut: [0.05, 0.13] as const,
  duoRecede: [0.12, 0.22] as const,
  probeIn: [0.13, 0.19] as const,
  theatre: [0.17, 0.55] as const,
  scanCards: [0.24, 0.5] as const,
  scan: [0.26, 0.52] as const, // globe city-scan window (drives the active dot)
  matchResolve: [0.52, 0.58] as const,
  duoReturn: [0.56, 0.66] as const,
  chatDock: [0.6, 0.68] as const,
  matchFly: [0.66, 0.74] as const,
  payload: [0.75, 0.82] as const,
  reply: [0.8, 0.84] as const,
  deliver: [0.85, 0.9] as const,
  dim: [0.9, 0.95] as const,
  whisper: [0.91, 0.96] as const,
  finale: [0.94, 1] as const,
};

/* the film-progress point at which the globe dot holds green (a hair before the
   DOM match card resolves, so the dot anticipates the card). */
export const MATCH_HOLDS_AT = 0.5;

export const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* normalized progress of p inside the [a, b] window, clamped 0..1 */
export const seg = (p: number, a: number, b: number) =>
  clamp((p - a) / (b - a), 0, 1);

/* smooth in/out easing (the prototype's `ease`) */
export const easeIO = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/* overshoot easing for the match head pop (the prototype's easeBack) */
export const easeBack = (t: number) =>
  1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

/* which act rail dot is lit (0-indexed) for a given film progress */
export const actForProgress = (p: number) =>
  p < 0.17 ? 0 : p < 0.52 ? 1 : p < 0.85 ? 2 : 3;
