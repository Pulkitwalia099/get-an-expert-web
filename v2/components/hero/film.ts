/* film.ts - the single source of truth for the hero film's choreography.
 *
 * These numbers come straight from the locked choreography prototype (Hero v7):
 * every phase boundary lives in "film progress" space (0 -> 1 across the whole
 * four-act film). Both the DOM timeline (HeroFilm) and the R3F globe (Globe)
 * read from here so the search bar and the globe stay in lockstep.
 *
 * This branch (Day 3) builds Acts 1 and 2 only. ACT2_END is the film-progress
 * value where Act 2 resolves (the match card holds). We map the whole scrubbed
 * scroll range onto 0 -> ACT2_END so Acts 1+2 fill the pin with no dead tail.
 * Day 4 raises ACT2_END to 1 and TRACK_VH toward ~560 to turn on Acts 3+4.
 */

export const ASK = "Get an expert to build the launch video";

export const CITIES = [
  "san francisco",
  "berlin",
  "bangalore",
  "tokyo",
  "são paulo",
  "london",
  "lagos",
  "seoul",
];

/* Film progress the top of the scroll maps to. The match resolves at 0.52-0.6,
   so mapping to 0.7 leaves a short hold tail (scroll ~0.86-1.0) where the
   resolved match sits full-screen for a beat before the pin releases.
   Day 4: set to 1 so the scroll reaches Acts 3+4. */
export const ACT2_END = 0.7;

/* Sticky-stage pin length, in vh. Sized so Acts 1+2 breathe without a dead
   tail. Day 4: raise toward 560 as the later acts are added. */
export const TRACK_VH = 420;

/* Phase boundaries in film-progress space (from the prototype's apply(p)). */
export const PHASES = {
  headOut: [0.04, 0.18] as const,
  probeFly: [0.06, 0.22] as const,
  probeSway: [0.2, 0.32] as const,
  probeSwaySettle: [0.5, 0.6] as const,
  searchingClass: [0.14, 0.52] as const,
  globeIn: [0.1, 0.2] as const,
  globeOut: [0.72, 0.9] as const, // pushed past ACT2_END: the globe stays up through Act 2's finish
  scan: [0.18, 0.52] as const,
  searchlineOn: [0.13, 0.6] as const,
  matchResolve: [0.52, 0.6] as const,
  cueOut: [0.42, 0.55] as const,
};

export const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* normalized progress of p inside the [a, b] window, clamped 0..1 */
export const seg = (p: number, a: number, b: number) =>
  clamp((p - a) / (b - a), 0, 1);

/* smooth in/out easing (matches the prototype's easeIO) */
export const easeIO = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/* which act rail dot is lit for a given film progress */
export const actForProgress = (p: number) =>
  p < 0.1 ? 1 : p < 0.52 ? 2 : p < 0.87 ? 3 : 4;
