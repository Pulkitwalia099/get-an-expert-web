/* film.ts - the single source of truth for the hero film's choreography.
 *
 * These numbers come straight from the locked choreography prototype (Hero v7):
 * every phase boundary lives in "film progress" space (0 -> 1 across the whole
 * four-act film). Both the DOM timeline (HeroFilm) and the R3F globe (Globe)
 * read from here so the search bar and the globe stay in lockstep.
 *
 * ACT2_END is the film-progress value the bottom of the scroll maps to. Day 3
 * held it at 0.7 so only Acts 1+2 filled the pin. Day 4 opens the full film:
 * ACT2_END -> 1 maps the whole scrubbed range across all four acts, and
 * TRACK_VH grows so the later acts have room to breathe.
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

/* Film progress the bottom of the scroll maps to. 1 = the full four-act film
   plays across the whole pin (Act 4 delivered sits at the very end). */
export const ACT2_END = 1;

/* Sticky-stage pin length, in vh. Sized so all four acts breathe: Acts 1+2
   fill the first ~55% of scroll, Acts 3+4 the rest. */
export const TRACK_VH = 560;

/* Phase boundaries in film-progress space. Acts 1+2 (from the prototype's
   apply(p)) resolve by ~0.6; Acts 3+4 play out from there to 1. */
export const PHASES = {
  // Act 1: the ask
  headOut: [0.04, 0.16] as const,
  probeFly: [0.06, 0.2] as const,
  probeSway: [0.18, 0.3] as const,
  probeSwaySettle: [0.46, 0.56] as const,
  searchingClass: [0.14, 0.5] as const,
  cueOut: [0.4, 0.52] as const,
  // Act 2: the search
  globeIn: [0.1, 0.2] as const,
  globeOut: [0.6, 0.74] as const, // globe clears as the product panel rises
  scan: [0.18, 0.5] as const,
  searchlineOn: [0.13, 0.58] as const,
  matchResolve: [0.5, 0.58] as const,
  // Act 3: the match lands in the session
  productRise: [0.58, 0.78] as const, // the real product splitscreen rises up
  probeOut: [0.58, 0.7] as const, // the flying probe clears once the match resolves
  matchFly: [0.64, 0.82] as const, // match card flies from the globe stage to the chat slot
  matchFlyOut: [0.8, 0.87] as const, // the flying card dissolves as the resident card takes over
  matchLand: [0.78, 0.86] as const, // resident card glows in inside the chat slot
  chips: [0.72, 0.88] as const, // context chips arc from the app pane to the chat side
  reply: [0.83, 0.9] as const, // expert reply: "I know what you're looking for. On it."
  // Act 4: delivered
  agentOn: [0.87, 0.93] as const, // the agent continues in the app pane
  deliver: [0.88, 0.95] as const, // delivery lands in the session
  whisper: [0.91, 0.97] as const, // "You never left your session."
  ctas: [0.93, 1] as const, // closing CTAs rise
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
  p < 0.1 ? 1 : p < 0.5 ? 2 : p < 0.87 ? 3 : 4;
