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

/* Sticky-stage pin length, in vh. Iteration 4 grows the track to 840vh to give
   the new "THE WAIT" beat room to breathe. */
export const TRACK_VH = 840;

/* Kept for API stability: the whole scroll maps film progress 0 -> 1. */
export const ACT2_END = 1;

/* Phase boundaries in film-progress space, verbatim from iteration 4's P map.
   The B-numbers below map to the BEATS LEGEND in the spec. Windows named here
   are the reusable ones; a few one-off segs are inlined at their call site in
   HeroFilm so the port stays faithful to the spec. */
export const PHASES = {
  headOut: [0.05, 0.12] as const, // B1
  duoRecede: [0.12, 0.2] as const, // B2: session recedes, probe frozen at composer
  probeRise: [0.2, 0.28] as const, // B2: probe rises to search position + shrinks
  theatre: [0.22, 0.55] as const, // B3
  scanCards: [0.26, 0.52] as const,
  scan: [0.26, 0.52] as const, // globe city-scan window (drives the active dot)
  matchResolve: [0.52, 0.58] as const, // B4
  duoReturn: [0.56, 0.66] as const, // B5: room + session return to day
  chatDock: [0.6, 0.68] as const,
  matchFly: [0.58, 0.68] as const, // B5: match card travels right into the chat
  probeHome: [0.6, 0.68] as const, // B5: probe travels down-left home (non-crossing)
  payload: [0.7, 0.76] as const, // B6: context flies in horizontally from the left
  reply: [0.76, 0.81] as const, // B7
  wait: [0.81, 0.9] as const, // B8: "one hour later"
  deliver: [0.9, 0.935] as const, // B9
  whisper: [0.935, 0.965] as const, // B10
  finale: [0.955, 1] as const, // B10
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
  p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.9 ? 2 : 3;
