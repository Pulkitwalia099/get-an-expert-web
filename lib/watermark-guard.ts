// What the server will and will not watermark, in a file a browser may read.
//
// Split out of lib/watermark.ts for the reason lib/credit-math.ts is split out
// of lib/credits.ts: that module spawns ffmpeg and throws on sight of a
// browser, and the dashboard needs the same limits to decide, before it
// uploads four hundred megabytes, whether it is going to ask for one file or
// two. One copy of the numbers, checked on both sides.

/**
 * The encode budget, in seconds of 1080p.
 *
 * Not a preference. A function is killed at 300 seconds, and a kill mid-encode
 * looks identical to a hang from the dashboard.
 *
 * Measured rather than guessed: 77 seconds of 1080p took 117 seconds end to
 * end on a preview deployment on 14 Aug, which is 1.5x its own length once the
 * download and the upload are counted. Two minutes of 1080p therefore lands
 * near 180 seconds, inside the 240 the encode allows itself.
 *
 * Held in 1080p seconds rather than plain seconds because the plain number is
 * wrong for anything else. A 4K frame is four times the pixels, so two minutes
 * of it is four times the work: about twelve minutes, which cannot finish and
 * would have been accepted by a check that only read the clock. The operator
 * would have waited four minutes to be told to do it themselves.
 */
export const MAX_ENCODE_BUDGET = 120;

/** The frame this budget is denominated in. */
const REFERENCE_PIXELS = 1920 * 1080;

/**
 * Longest cut we take at any resolution.
 *
 * The budget above already turns away a long 4K cut, but a very long cut at a
 * small frame size would pass it while still being a strange thing to hand a
 * function: ten minutes of 480p is inside the budget and outside anything this
 * flow was built for. This is the second, simpler wall.
 */
export const MAX_SOURCE_SECONDS = 300;

export const MAX_SOURCE_BYTES = 500 * 1024 * 1024;

export interface Source {
  bytes?: number | null;
  seconds?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface GuardVerdict {
  ok: boolean;
  /** Shown to the operator as it is written. Null when nothing is wrong. */
  reason: string | null;
}

/** Whole minutes to one decimal place, for a sentence rather than a log line. */
function minutes(seconds: number): string {
  return `${Math.round(seconds / 6) / 10} minutes`;
}

const SEND_BOTH = 'so upload the watermarked sample too.';

/**
 * Whether this file may be watermarked here, or has to go through the desk.
 *
 * Unknown values pass. A browser that could not read a duration should not
 * cost the operator the one drop flow, and the server checks again with
 * ffprobe before spending anything: this side is here to explain the refusal
 * before the upload, not to be the only thing preventing one.
 */
export function guardVerdict(source: Source): GuardVerdict {
  const seconds = usable(source.seconds);
  const bytes = usable(source.bytes);
  const width = usable(source.width);
  const height = usable(source.height);

  if (seconds !== null && seconds > MAX_SOURCE_SECONDS) {
    return {
      ok: false,
      reason: `That cut is ${minutes(seconds)}. Anything over ${
        MAX_SOURCE_SECONDS / 60
      } cannot be watermarked here in time, ${SEND_BOTH}`,
    };
  }

  if (seconds !== null && width !== null && height !== null) {
    const cost = (seconds * width * height) / REFERENCE_PIXELS;
    if (cost > MAX_ENCODE_BUDGET) {
      // The frame size is named, because "2 minutes is too long" is confusing
      // to somebody who watermarked a 2 minute cut here yesterday. What
      // changed was the resolution, so the resolution is what the sentence
      // talks about.
      return {
        ok: false,
        reason: `That is ${minutes(seconds)} at ${width} by ${height}. There is more here than can be watermarked in time, ${SEND_BOTH}`,
      };
    }
  } else if (seconds !== null && seconds > MAX_ENCODE_BUDGET) {
    // No frame size, so the budget is read as plain seconds and 1080p is
    // assumed. Anything larger fails on the server, which is the honest
    // outcome for a file the browser could not describe.
    return {
      ok: false,
      reason: `That cut is ${minutes(seconds)}. Anything over ${
        MAX_ENCODE_BUDGET / 60
      } cannot be watermarked here in time, ${SEND_BOTH}`,
    };
  }

  if (bytes !== null && bytes > MAX_SOURCE_BYTES) {
    return {
      ok: false,
      reason: `That file is ${Math.round(bytes / (1024 * 1024))}MB. Anything over ${
        MAX_SOURCE_BYTES / (1024 * 1024)
      }MB cannot be watermarked here in time, ${SEND_BOTH}`,
    };
  }

  return { ok: true, reason: null };
}

function usable(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
