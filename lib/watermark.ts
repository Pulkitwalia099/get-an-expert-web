import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { guardVerdict } from '@/lib/watermark-guard';

// One file in, both out.
//
// The operator drops the clean cut and the server produces the watermarked
// sample from it. Before this, the dashboard asked for two files and trusted
// whoever uploaded them to have watermarked one of the two, which is a rule
// living in somebody's head rather than in the code.
//
// This runs inside a Vercel function, which is killed at 300 seconds however
// far the encode has got. So it does not try to be the answer for everything:
// `guardVerdict` below turns away anything long or large enough to risk that,
// the dashboard keeps its two file flow for those, and `npm run send` on a
// desk machine is what a ten minute 4K edit goes through. A watermark that
// only sometimes finishes is worse than one that says up front it will not.

if (typeof window !== 'undefined') {
  throw new Error('lib/watermark is server-only and must never reach the client');
}

// Re-exported so a server caller has one import for the whole thing. The
// numbers themselves live in lib/watermark-guard, which the dashboard reads.
export {
  MAX_ENCODE_BUDGET,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_SECONDS,
  guardVerdict,
  type GuardVerdict,
} from '@/lib/watermark-guard';

const run = promisify(execFile);

/** The mark, at `assets/watermark.png`. 420x90, drawn with PIL at 4x and downsampled. */
export const MARK_PATH = join(process.cwd(), 'assets', 'watermark.png');

/**
 * The approved size and placement, as proportions of the frame.
 *
 * These come off the second mark, approved on 14 Aug after the first one was
 * rejected. The first was a small dark corner badge and it was invisible in
 * motion on dark footage: Pulkit reported "there is no watermark" twice while
 * still frames proved it was there, which is the least useful fact available.
 * A watermark nobody notices is not a watermark. What replaced it is a white
 * plate reading "midsesh SAMPLE" at about half the frame width.
 *
 * Held as ratios rather than pixels so a 9:16 phone cut and a 16:9 landscape
 * cut carry the same weight. 40px of inset on a 1080 wide vertical video is
 * nearly double what it is on a 1920 wide one, and reads as a different mark.
 *
 * The horizontal inset is a proportion of the width and the vertical one a
 * proportion of the *height*, which is the one asymmetry here. It exists
 * because the vertical number is not decoration: it lifts the mark clear of
 * the HTML5 control bar and of a burned in caption, both of which sit at the
 * bottom of the frame whatever its shape. 0.135 of the height reproduces
 * exactly the 260px that was approved on a 1080x1920 frame.
 */
export const MARK_WIDTH_RATIO = 0.5;
export const MARK_X_INSET_RATIO = 0.037;
export const MARK_Y_INSET_RATIO = 0.135;

/** Natural size of the PNG. Only its shape matters; the height follows the width. */
const MARK_NATURAL_WIDTH = 420;
const MARK_NATURAL_HEIGHT = 90;

/**
 * How long ffmpeg is allowed before it is stopped.
 *
 * Under the 300 the platform enforces, so the failure is ours and can carry a
 * sentence explaining itself, rather than the platform's, which arrives as a
 * dead connection. The remainder covers the probe and the upload of the result.
 */
export const ENCODE_TIMEOUT_MS = 240_000;

export interface MarkGeometry {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * The mark's pixel size for one frame width.
 *
 * Worked out here rather than in the filter graph. ffmpeg can size one input
 * against another with `scale2ref`, but what `main_w` means inside it changed:
 * on ffmpeg 8 it resolves to the width of the image being scaled, and the same
 * filter that draws a 269px mark on ffmpeg 4 draws a 42px one. Computing the
 * number in TypeScript is a line of arithmetic that behaves the same on every
 * build, and it can be unit tested, which a filter string cannot.
 *
 * Rounded to even numbers because x264 will not take odd dimensions on the
 * yuv420p pixel format the output uses.
 */
export function markGeometry(frameWidth: number, frameHeight: number): MarkGeometry {
  const width = even(Math.round(frameWidth * MARK_WIDTH_RATIO));
  return {
    width,
    height: even(Math.round((width * MARK_NATURAL_HEIGHT) / MARK_NATURAL_WIDTH)),
    x: Math.max(8, Math.round(frameWidth * MARK_X_INSET_RATIO)),
    y: Math.max(8, Math.round(frameHeight * MARK_Y_INSET_RATIO)),
  };
}

function even(n: number): number {
  const floored = Math.max(2, Math.round(n));
  return floored % 2 === 0 ? floored : floored + 1;
}

export interface SourceInfo {
  width: number;
  height: number;
  seconds: number | null;
}

/**
 * Whether the frame plays a quarter turn from how it is stored.
 *
 * Exported so it can be tested without a file. Either spelling may be present
 * and either may be signed, so both are read as an angle and only a quarter
 * turn counts: a video flagged 180 plays at the size it is stored.
 */
export function quarterTurned(tag: string | undefined, sideData: number | undefined): boolean {
  for (const raw of [tag, sideData]) {
    const angle = Math.abs(Number(raw ?? 0));
    if (Number.isFinite(angle) && angle % 180 === 90) return true;
  }
  return false;
}

/**
 * The arguments ffmpeg is given, as a list rather than a command line.
 *
 * A list because these values include a URL somebody else's system produced,
 * and a string command line hands that to a shell. `execFile` with an array
 * never involves one.
 *
 * The overlay's position is an expression rather than the two numbers this
 * function already knows, so the corner is right even if the frame turns out
 * to be a size the probe did not report. Only the mark's own size needs the
 * number, and getting that slightly wrong is a mark that is slightly small
 * rather than a mark halfway off the frame.
 */
export function encodeArgs(source: string, out: string, geometry: MarkGeometry): string[] {
  const { width, height, x, y } = geometry;
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    source,
    '-i',
    MARK_PATH,
    '-filter_complex',
    `[1:v]scale=${width}:${height}[wm];` +
      `[0:v][wm]overlay=main_w-overlay_w-${x}:main_h-overlay_h-${y}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    // Copied rather than re-encoded. Nothing here touches the audio, and an
    // extra encode of it is time spent inside a 300 second budget for a file
    // that would sound the same.
    '-c:a',
    'copy',
    // Without this the index sits at the end of the file and a browser has to
    // fetch the whole thing before the first frame. The customer's order page
    // plays this inline, so it would look broken on a slow connection.
    '-movflags',
    '+faststart',
    out,
  ];
}

/**
 * What the source actually is, from ffprobe rather than from the browser.
 *
 * The dashboard checks size and duration too, before it uploads anything, so
 * the operator hears about a file that is too long before spending four
 * minutes sending it. That check is a courtesy and this one is the rule: a
 * page can be wrong about a file, and it is this side that pays for it with a
 * killed function.
 */
export async function probe(source: string): Promise<SourceInfo | null> {
  try {
    // The whole stream rather than a list of fields. `show_entries` cannot
    // reach into `side_data_list`, which is where the rotation lives, and the
    // section name that can differs between ffprobe 4 and 5. Reading the lot
    // and picking from it in TypeScript behaves the same on both.
    const { stdout } = await run(
      ffprobe.path,
      ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_format', '-of', 'json', source],
      { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );

    const parsed = JSON.parse(stdout) as {
      streams?: {
        width?: number;
        height?: number;
        tags?: { rotate?: string };
        side_data_list?: { rotation?: number }[];
      }[];
      format?: { duration?: string };
    };
    const stream = parsed.streams?.[0];
    if (!stream?.width || !stream?.height) return null;

    // A video shot on a phone is stored landscape with a rotation flag, and
    // ffmpeg turns it upright on the way into the filter graph. So the width
    // the mark is sized against is the one after that turn, not the one in the
    // container. Without this a vertical UGC ad, which is most of them, gets a
    // mark sized for the 1920 it is stored as rather than the 1080 it plays at.
    //
    // Two spellings, because both are still in the wild: a `rotate` tag is what
    // older files and older ffprobes carry, and `side_data_list` is where the
    // same quarter turn is reported now.
    const turned = quarterTurned(stream.tags?.rotate, stream.side_data_list?.[0]?.rotation);
    const seconds = Number(parsed.format?.duration);

    return {
      width: turned ? stream.height : stream.width,
      height: turned ? stream.width : stream.height,
      seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null,
    };
  } catch (err) {
    console.error('[midsesh:watermark] could not probe the source', err);
    return null;
  }
}

export type WatermarkResult =
  | { ok: true; body: Buffer; seconds: number | null }
  | { ok: false; error: string };

/**
 * Draw the mark on one file and hand back the bytes.
 *
 * The caller stores them. This does not know about Blob, orders or who is
 * asking, which is what lets the test run it against a file on disk.
 *
 * The output goes through a temporary file rather than a pipe because mp4
 * cannot be written to one: the index has to be moved to the front once the
 * length is known, and that needs somewhere seekable. It is deleted in a
 * `finally`, since a function instance is reused between requests and a
 * half gigabyte left behind is charged to the next encode's disk.
 */
export async function watermarkVideo(source: string): Promise<WatermarkResult> {
  const info = await probe(source);
  if (!info) {
    return { ok: false, error: 'That file could not be read as a video.' };
  }

  // Everything ffprobe reported, so the budget is judged on real pixels rather
  // than on what the browser guessed before the upload.
  const verdict = guardVerdict({
    seconds: info.seconds,
    width: info.width,
    height: info.height,
  });
  if (!verdict.ok) return { ok: false, error: verdict.reason ?? 'That file is too long.' };

  const out = join(tmpdir(), `wm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp4`);
  try {
    await run(ffmpeg.path, encodeArgs(source, out, markGeometry(info.width, info.height)), {
      timeout: ENCODE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, body: await readFile(out), seconds: info.seconds };
  } catch (err) {
    const killed = err !== null && typeof err === 'object' && 'killed' in err && err.killed === true;
    console.error('[midsesh:watermark] encode failed', err);
    return {
      ok: false,
      error: killed
        ? 'The watermark took too long and was stopped. Upload the watermarked sample yourself for this one.'
        : 'The watermark could not be drawn on that file.',
    };
  } finally {
    await rm(out, { force: true }).catch(() => {});
  }
}
