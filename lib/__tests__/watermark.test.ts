import { describe, expect, it } from 'vitest';
import {
  MAX_ENCODE_BUDGET,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_SECONDS,
  encodeArgs,
  guardVerdict,
  markGeometry,
  quarterTurned,
} from '@/lib/watermark';

// The geometry and the guard, which are the two things here that can be wrong
// without anybody noticing. A mark that is the wrong size on vertical video
// still ships a plausible looking file, and a guard that lets a long cut
// through fails as a timeout four minutes later.

describe('markGeometry', () => {
  it('reproduces the placement approved on a 1080x1920 phone cut', () => {
    // Half the frame wide, 40px in from the right and 260px up from the
    // bottom, which is the mark Pulkit approved after the first one was
    // rejected for being invisible in motion.
    const { width, height, x, y } = markGeometry(1080, 1920);
    expect(width).toBe(540);
    expect(height).toBe(116);
    expect(x).toBe(40);
    expect(y).toBeCloseTo(260, -1);
  });

  it('gives a landscape cut the same visual weight, not the same pixels', () => {
    const phone = markGeometry(1080, 1920);
    const wide = markGeometry(1920, 1080);
    expect(wide.width).toBeGreaterThan(phone.width);
    expect(wide.width / 1920).toBeCloseTo(phone.width / 1080, 2);
    expect(wide.x / 1920).toBeCloseTo(phone.x / 1080, 2);
  });

  it('lifts the mark off the bottom in proportion to the height, not the width', () => {
    // The vertical inset clears the HTML5 control bar and a burned in caption,
    // both of which sit at the bottom whatever shape the frame is. Tied to the
    // width it would sit nearly half way up a 16:9 frame.
    const wide = markGeometry(1920, 1080);
    expect(wide.y).toBeLessThan(wide.width);
    expect(wide.y / 1080).toBeCloseTo(markGeometry(1080, 1920).y / 1920, 2);
  });

  it('keeps every dimension even, because x264 rejects odd ones on yuv420p', () => {
    for (const [w, h] of [[640, 360], [720, 1280], [1080, 1920], [1234, 567], [3840, 2160]]) {
      const { width, height } = markGeometry(w, h);
      expect(width % 2).toBe(0);
      expect(height % 2).toBe(0);
    }
  });

  it('keeps the mark off the very edge of a small frame', () => {
    expect(markGeometry(320, 240).x).toBeGreaterThanOrEqual(8);
    expect(markGeometry(320, 240).y).toBeGreaterThanOrEqual(8);
  });
});

describe('guardVerdict', () => {
  const HD = { width: 1920, height: 1080 };
  const UHD = { width: 3840, height: 2160 };

  it('passes a normal ad', () => {
    expect(guardVerdict({ bytes: 40 * 1024 * 1024, seconds: 32, ...HD }).ok).toBe(true);
  });

  it('passes two minutes of 1080p, which is what the budget was set from', () => {
    expect(guardVerdict({ seconds: MAX_ENCODE_BUDGET, ...HD }).ok).toBe(true);
  });

  it('passes when the browser could not work anything out', () => {
    expect(guardVerdict({}).ok).toBe(true);
    expect(guardVerdict({ bytes: null, seconds: null, width: null, height: null }).ok).toBe(true);
  });

  it('turns away two minutes of 4K, which reads as short and is four times the work', () => {
    // The case a duration-only guard accepts and the function then dies on,
    // four minutes after the operator started waiting.
    const verdict = guardVerdict({ seconds: 120, ...UHD });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('3840 by 2160');
    expect(verdict.reason).toContain('upload the watermarked sample too');
  });

  it('still takes a short 4K cut, because the budget is work and not pixels', () => {
    expect(guardVerdict({ seconds: 25, ...UHD }).ok).toBe(true);
  });

  it('takes a longer cut at a smaller frame, for the same reason', () => {
    expect(guardVerdict({ seconds: 240, width: 1280, height: 720 }).ok).toBe(true);
  });

  it('turns away a cut past the outer limit whatever its frame size', () => {
    const verdict = guardVerdict({ seconds: MAX_SOURCE_SECONDS + 1, width: 640, height: 360 });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('upload the watermarked sample too');
  });

  it('falls back to plain seconds when the frame size is unknown', () => {
    expect(guardVerdict({ seconds: MAX_ENCODE_BUDGET + 1 }).ok).toBe(false);
    expect(guardVerdict({ seconds: MAX_ENCODE_BUDGET - 1 }).ok).toBe(true);
  });

  it('turns away a file too large to move in time', () => {
    const verdict = guardVerdict({ bytes: MAX_SOURCE_BYTES + 1, seconds: 10, ...HD });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('MB');
  });

  it('says how long the cut actually was, so the number is not a mystery', () => {
    expect(guardVerdict({ seconds: 600 }).reason).toContain('10 minutes');
  });

  it('reads as English, with no em dashes', () => {
    const reasons = [
      guardVerdict({ seconds: 999 }).reason,
      guardVerdict({ seconds: 120, ...UHD }).reason,
      guardVerdict({ bytes: MAX_SOURCE_BYTES * 2, seconds: 1 }).reason,
    ];
    for (const reason of reasons) {
      expect(reason).not.toContain('—');
      expect(reason).toMatch(/[.!?]$/);
    }
  });
});

describe('encodeArgs', () => {
  const args = encodeArgs(
    'https://blob.example/clean.mp4',
    '/tmp/out.mp4',
    markGeometry(1080, 1920),
  );

  it('passes the source as its own argument, never inside a command line', () => {
    // A URL from somewhere else, concatenated into a shell string, is the one
    // way this route could run something other than ffmpeg.
    expect(args).toContain('https://blob.example/clean.mp4');
    expect(args.some((a) => a.includes('&&') || a.includes(';  '))).toBe(false);
  });

  it('places the mark with expressions, not with the probe', () => {
    const filter = args[args.indexOf('-filter_complex') + 1];
    expect(filter).toContain('overlay=main_w-overlay_w-40:main_h-overlay_h-259');
    expect(filter).toContain('scale=540:116');
  });

  it('copies the audio rather than spending encode time on it', () => {
    expect(args.slice(args.indexOf('-c:a')).at(1)).toBe('copy');
  });

  it('moves the index to the front so the order page can stream it', () => {
    expect(args.slice(args.indexOf('-movflags')).at(1)).toBe('+faststart');
  });

  it('writes to the path it was given, last', () => {
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });
});

describe('quarterTurned', () => {
  it('spots a phone clip stored landscape and played upright', () => {
    // A vertical UGC ad is most of what comes through here, and it arrives
    // stored 1920x1080 with a quarter turn on it. Sized against the stored
    // width, the mark comes out nearly twice as large as approved.
    expect(quarterTurned('90', undefined)).toBe(true);
    expect(quarterTurned(undefined, -90)).toBe(true);
    expect(quarterTurned('270', undefined)).toBe(true);
  });

  it('leaves an upside down clip at the size it is stored', () => {
    expect(quarterTurned('180', undefined)).toBe(false);
    expect(quarterTurned(undefined, 180)).toBe(false);
  });

  it('treats a missing or unreadable flag as no rotation', () => {
    expect(quarterTurned(undefined, undefined)).toBe(false);
    expect(quarterTurned('0', 0)).toBe(false);
    expect(quarterTurned('nonsense', undefined)).toBe(false);
  });
});
