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
  probeRise: [0.19, 0.28] as const, // B2: probe rises, overlapping the recede tail
  theatre: [0.22, 0.55] as const, // B3
  scanCards: [0.26, 0.52] as const,
  scan: [0.26, 0.52] as const, // globe city-scan window (drives the active dot)
  matchResolve: [0.52, 0.58] as const, // B4
  duoReturn: [0.56, 0.66] as const, // B5: room + session return to day
  chatDock: [0.6, 0.68] as const,
  matchFly: [0.57, 0.68] as const, // B5: match card travels right, riding the resolve tail
  probeHome: [0.6, 0.68] as const, // B5: probe travels down-left home (non-crossing)
  payload: [0.7, 0.76] as const, // B6: context flies in horizontally from the left
  reply: [0.755, 0.81] as const, // B7: overlaps the payload landing (cross-fade)
  wait: [0.81, 0.9] as const, // B8: "one hour later" clock over the chat pane
  deliver: [0.9, 0.935] as const, // B9
  whisper: [0.935, 0.965] as const, // B10
  finale: [0.955, 1] as const, // B10
};

/* B3->B4: the globe eases its free spin to a hold angle over this window so the
   match dot pins in the dome's lower-right quadrant before the head pops. */
export const HOLD: readonly [number, number] = [0.44, 0.5];
/* target world azimuth for the held dot (front-right, ~4-5 o'clock on the dome) */
export const HOLD_TARGET_AZ = Math.PI / 4;
/* latitude (radians, below the equator) the held city sits at, so it reads lower */
export const HELD_LAT = -0.42;

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

/* ==================================================================
   THE EASING VOCABULARY

   The film used to run on easeIO and easeBack alone, so a headline
   lifting away, a probe launching, a card docking and a 1060px panel
   receding into depth all shared one acceleration profile. Nothing had
   weight, because weight IS the acceleration profile. Each curve below
   names the gesture it serves.

   SCRUB SAFETY. The film is scrubbed in both directions and must
   retrace exactly. Every curve here is a pure function of its argument:
   no time, no velocity accumulator, no reference to a previous frame,
   no internal mutable state. The spring is a closed-form damped
   oscillation, not an integrator, precisely so that f(0.4) is the same
   number whether the scrub arrived at 0.4 going forwards or backwards.

   Every curve is exactly 0 at t=0 and exactly 1 at t=1, so a curve can
   be swapped at a call site without moving the beat's endpoints. Only
   HOW a beat travels changes; never WHEN it fires.
   ================================================================== */

/* Power in/out family. Splitting at `s` and using exponent `n` on both
   halves is C1-continuous at the seam for any s and n (both one-sided
   derivatives equal n there), which is what lets the asymmetric splits
   below stay smooth. s < 0.5 means the deceleration half is longer than
   the acceleration half: a longer settle. */
const powerIO = (t: number, n: number, s: number) => {
  const c = clamp(t, 0, 1);
  return c < s
    ? s * Math.pow(c / s, n)
    : 1 - (1 - s) * Math.pow((1 - c) / (1 - s), n);
};

/* Closed-form damped oscillation, normalized to land exactly on 1.
 *
 * The unnormalized step response of a damped spring does not reach
 * exactly 1 at t=1 (it is still ringing at the 0.5-1% level), and at a
 * phase boundary that residual is a visible snap. Dividing by the
 * value at t=1 pins both endpoints exactly while preserving the shape,
 * at the cost of scaling the overshoot by about one percent.
 *
 * `freq` is oscillations across the window; `damp` is the damping ratio
 * (0 = forever, 1 = no overshoot at all). Overshoot is
 * exp(-pi*z/sqrt(1-z^2)), which is how the numbers below were chosen
 * rather than dialled in by eye. */
const makeSpring = (freq: number, damp: number) => {
  const w = freq * Math.PI * 2;
  const z = clamp(damp, 0.01, 0.999);
  const wd = w * Math.sqrt(1 - z * z);
  const raw = (t: number) =>
    1 -
    Math.exp(-z * w * t) *
      (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  const at1 = raw(1);
  return (t: number) => raw(clamp(t, 0, 1)) / at1;
};

/* SETTLE - a weighted thing arrives and comes to rest.
   Damping 0.74 gives ~3% overshoot: on the probe's ~49vh fall home that
   is about 15px past the mark before it rocks back, which reads as mass.
   A livelier spring here read as a bounce, and the product is calm.
   Serves: the match card docking into the chat slot, the probe's return
   home, the context payload's landing. */
export const easeSettle = makeSpring(1.05, 0.74);

/* SETTLE (soft) - a lighter arrival that is allowed one visible rock.
   ~11% overshoot. Used where the travel is small enough that the firm
   settle would be invisible, so the overshoot is what sells the landing.
   Serves: the delivered video attachment landing in the chat. */
export const easeSettleSoft = makeSpring(1.2, 0.58);

/* ANTICIPATION - the gesture loads backwards before it travels, the way
   a body dips before it jumps. The dip is a half-sine over the first
   fifth of the window, so it leaves from zero and returns exactly to
   zero; the travel then runs on a decelerating cubic, so the element
   arrives and stops rather than slamming into its mark.
   5% of the travel distance is enough to read as intent and not enough
   to read as a cartoon wind-up.
   Serves: the probe's rise out of the session, the match card's launch. */
export const easeAnticipate = (t: number) => {
  const c = clamp(t, 0, 1);
  const dip = 0.2;
  if (c < dip) return -0.05 * Math.sin((c / dip) * Math.PI);
  const u = (c - dip) / (1 - dip);
  return 1 - Math.pow(1 - u, 3);
};

/* HEAVY - a large slow object. Mass reads as reluctance to start and
   reluctance to stop, so this accelerates on a steep power curve and
   spends 58% of the window decelerating: slower off the mark and a
   much longer settle than easeIO's symmetric quadratic.
   Serves: the session panel receding into depth and returning, and the
   expert chat pane docking. */
export const easeHeavy = (t: number) => powerIO(t, 3.2, 0.42);

/* SNAP - a small light element. Almost no acceleration ramp, then a
   quick decelerating stop. Light things are already moving by the time
   you notice them.
   Serves: scan card entries, the delivered chip, the expert reply. */
export const easeSnap = (t: number) => {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 4);
};

/* DEPART - something leaving frame never arrives, so it should still be
   accelerating when it goes. A thing that eases OUT of the shot has
   been stopped by the edge, not by itself.
   Serves: the headline lifting away. */
export const easeDepart = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (0.4 + 0.6 * c);
};

/* ---------- travel on arcs ----------
   Every positional move in the film was a straight lerp between two
   points, so everything slid along a ruler. These put travel on a
   quadratic Bezier instead. */

/* The perpendicular displacement profile of a quadratic Bezier whose
   control point is pushed off the chord. Exactly 0 at both ends, so a
   path built from lerp + this offset keeps its original endpoints;
   normalized to peak at exactly 1 at the midpoint, so the caller's
   `peak` argument is a literal peak displacement in pixels. (The
   underlying Bezier term is 2t(1-t) with a control offset of 2*peak.) */
export const arcLift = (t: number) => {
  const c = clamp(t, 0, 1);
  return 4 * c * (1 - c);
};

/* A full 2D travel path: interpolate from a to b, then push the point
   perpendicular to the chord by up to `peak` pixels at the midpoint, so
   the travel rises and falls instead of sliding. A positive peak bows
   to the left of the direction of travel, which for a rightward move is
   upward on screen. Used where the chord's direction is not fixed (the
   probe's fall home tracks the live composer, which shifts left as the
   chat docks); where the direction is known, callers apply arcLift to
   the one axis directly. */
export const arcPoint = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  t: number,
  peak: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const l = arcLift(t) * peak;
  return {
    x: ax + dx * t + (dy / len) * l,
    y: ay + dy * t + (-dx / len) * l,
  };
};

/* Arc magnitudes, as a fraction of the viewport axis the bow runs along.
   Peak displacement at the midpoint of the travel. */
export const ARC = {
  /* the match card lobs right into the chat slot rather than sliding */
  matchFly: 0.055, // of viewport height, upward
  /* the probe swings out left as it falls home, exaggerating the drift
     it already has as the composer shifts left under the docking chat */
  probeHome: 0.035, // of viewport width, leftward
  /* the context payload lifts as it crosses to the chat */
  payload: 0.03, // of viewport height, upward
};

/* Follow-through: the lag between the parts of a multi-part element, in
   film-progress. Roughly 60-100ms at a natural scroll speed. Parts of
   one object arriving on the same frame is what makes them read as a
   printed block rather than an assembly. */
export const FOLLOW = 0.008;

/* which act rail dot is lit (0-indexed) for a given film progress */
export const actForProgress = (p: number) =>
  p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.9 ? 2 : 3;
