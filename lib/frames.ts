// The shot list, as the person reviewing the cut sees it.
//
// A frame is one shot: a number, where it starts, how long it runs and what
// happens in it. The boundaries are real cuts taken from the shot list the
// editor already works from, never an arbitrary split of the running time,
// because "frame 2" has to name something somebody can act on.
//
// Client safe on purpose. The player, the picker and the server route all read
// these, and the compile step below is the one place a note becomes the text an
// editor reads.

/** One shot. `t` and `d` are seconds from the start of the cut. */
export interface Frame {
  n: number;
  /** Start, in seconds. */
  t: number;
  /** Duration, in seconds. */
  d: number;
  name: string;
}

/** A note the customer wrote. `frame` is null when it is about the whole cut. */
export interface FrameNote {
  frame: number | null;
  text: string;
}

/** Longest single note. The compiled block is capped again by MAX_COMMENT. */
export const MAX_NOTE = 600;
/** Most notes one round of feedback may carry. */
export const MAX_NOTES = 24;
/** Longest frame name we will show. */
const MAX_NAME = 80;
/** Most shots in one cut. A 30 second ad with more than this is not a shot list. */
const MAX_FRAMES = 60;

/**
 * `0:02.4`. One decimal always, because shots run to fractions of a second and
 * a frame lasting 0.6s rendered as `0:00` names nothing.
 */
export function timecode(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const r = safe - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
}

/** `0:02.4 to 0:03.6`, the span an editor scrubs to. */
export function span(frame: Frame): string {
  return `${timecode(frame.t)} to ${timecode(frame.t + frame.d)}`;
}

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  // Newlines would break the one line per frame shape of the compiled block,
  // and this string is drawn over the video where it has one line to live on.
  const flat = value.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  return flat.length > 0 ? flat : fallback;
}

/**
 * Validate a frame list read back from Postgres.
 *
 * Returns null rather than an empty array when there is nothing usable, so a
 * caller can tell "no frames on this sample" from "a frame list that turned out
 * to be junk" without inspecting the contents. Everything downstream treats
 * both the same and simply renders no picker, which is the point: a sample with
 * no frames still plays and still takes free text feedback.
 *
 * This repo does not own `mk_order_events`, so the shape is checked here rather
 * than trusted. A bad row must not throw on a page somebody is waiting on.
 */
export function parseFrames(value: unknown): Frame[] | null {
  if (!Array.isArray(value)) return null;

  const out: Frame[] = [];
  for (const raw of value.slice(0, MAX_FRAMES)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const row = raw as Record<string, unknown>;
    const t = Number(row.t);
    const d = Number(row.d);
    if (!Number.isFinite(t) || !Number.isFinite(d) || t < 0 || d <= 0) continue;
    out.push({
      n: out.length + 1,
      t,
      d,
      name: cleanName(row.name, `Shot ${out.length + 1}`),
    });
  }
  if (out.length === 0) return null;

  // Renumbered from the sorted order rather than from whatever `n` the row
  // carried. The number is what the customer taps and what the editor reads
  // back, so it has to follow the cut. A stored list with a gap or a repeat
  // would otherwise put two frame 4s on the page.
  out.sort((a, b) => a.t - b.t);
  return out.map((f, i) => ({ ...f, n: i + 1 }));
}

/** The frame a given second falls in, or the first one. Never null. */
export function frameAt(frames: Frame[], seconds: number): Frame {
  let found = frames[0];
  for (const f of frames) if (seconds >= f.t - 1e-6) found = f;
  return found;
}

function byN(frames: Frame[], n: number): Frame | undefined {
  return frames.find((f) => f.n === n);
}

/**
 * Turn tagged notes into the block an editor reads.
 *
 * Run on the server, from the frame list stored against the sample, never from
 * what the browser sent. A tab left open across a recut would otherwise label
 * feedback with the old cut's shot names, which is worse than no names at all.
 *
 * The output is plain text on purpose. It goes into `mk_order_events.note`,
 * into the alert email and into the operator trail, all three of which are
 * text, so structure here would need a schema this repo does not own to change.
 *
 * Ordered by frame, with whole cut notes last, because that is the order
 * somebody works down a timeline.
 */
export function compileNotes(notes: FrameNote[], frames: Frame[]): string {
  const ordered = notes.slice(0, MAX_NOTES).sort((a, b) => {
    if (a.frame === null && b.frame === null) return 0;
    if (a.frame === null) return 1;
    if (b.frame === null) return -1;
    return a.frame - b.frame;
  });

  const blocks: string[] = [];
  for (const note of ordered) {
    const text = note.text.trim().slice(0, MAX_NOTE);
    if (!text) continue;
    const frame = note.frame === null ? undefined : byN(frames, note.frame);
    // A number that names no frame loses its heading rather than the note.
    // Somebody's words are the part that must survive.
    const head = frame ? `Frame ${frame.n}  (${span(frame)})\n  ${frame.name}` : 'Whole video';
    blocks.push(`${head}\n  ${text}`);
  }
  return blocks.join('\n\n');
}

/**
 * Seconds out of a timecode somebody typed.
 *
 * Deliberately forgiving: `0:02.4`, `2.4`, `:02`, `1:02.4` and `01:02` all mean
 * what they look like. This is read from a box an operator types into at the
 * end of a job, and rejecting `2.4` because it wanted `0:02.4` is a rule that
 * exists for the parser's benefit rather than the person's.
 */
export function seconds(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parts = text.split(':');
  if (parts.length > 3) return null;

  let total = 0;
  for (const part of parts) {
    const piece = part.trim();
    // An empty piece is only the `:02` shorthand, which means zero minutes.
    const n = piece === '' ? 0 : Number(piece);
    if (!Number.isFinite(n) || n < 0) return null;
    total = total * 60 + n;
  }
  return total;
}

/** The default length of a last shot with no end on it. */
const TAIL = 2;

/**
 * A shot list out of the lines an operator typed.
 *
 * One shot per line, a leading timecode and then the name:
 *
 *     0:00.0-0:00.6  Black, and one sound
 *     0:00.6         Two hands lower it in
 *
 * An end is optional because the next line already says where this shot stops.
 * Only the last one genuinely needs it, and if it is missing that shot gets two
 * seconds rather than the whole list being refused: a wrong tail on the final
 * shot is a smaller problem than an operator losing a list they just typed.
 */
export function parseFrameLines(text: string): Frame[] | null {
  if (typeof text !== 'string') return null;

  const rows: { t: number; end: number | null; name: string }[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = /^([0-9:.]+)(?:\s*[-–]\s*([0-9:.]+))?[\s|\t]*(.*)$/.exec(trimmed);
    if (!match) continue;
    const t = seconds(match[1]);
    if (t === null) continue;
    const end = match[2] ? seconds(match[2]) : null;
    rows.push({ t, end, name: match[3].trim() });
  }
  if (rows.length === 0) return null;

  rows.sort((a, b) => a.t - b.t);
  const frames = rows.map((row, i) => {
    const next = rows[i + 1]?.t;
    const stop = row.end !== null && row.end > row.t ? row.end : (next ?? row.t + TAIL);
    return { n: i + 1, t: row.t, d: Math.max(stop - row.t, 0.1), name: row.name };
  });
  // Back through the same validation the database read goes through, so the
  // list an operator sees is exactly the list a customer will get.
  return parseFrames(frames);
}

/** The lines back out again, so an operator edits what they wrote. */
export function framesToLines(frames: Frame[] | null): string {
  if (!frames) return '';
  return frames.map((f) => `${timecode(f.t)}-${timecode(f.t + f.d)}  ${f.name}`).join('\n');
}

/** True when this is a usable note payload from the browser. */
export function isFrameNote(value: unknown): value is FrameNote {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  const frameOk =
    row.frame === null || (typeof row.frame === 'number' && Number.isInteger(row.frame) && row.frame > 0);
  return frameOk && typeof row.text === 'string' && row.text.trim().length > 0;
}
