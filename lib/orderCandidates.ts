import { insertRows, patchRows, selectRows } from '@/lib/supabase';
import { parseFrames, type Frame } from '@/lib/frames';

// More than one cut on one order, and the one the customer picked.
//
// Only reached when somebody is being asked to choose between directions. An
// order with no rows in `mk_order_candidates` never calls anything here and
// behaves exactly as it did before this file existed, which is what makes the
// whole feature safe to deploy ahead of any order using it.
//
// Server only, like lib/orderTracking.ts, and for the same reason: it reads
// with the service key and must never be bundled into a browser.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderCandidates is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Slugs are ours, not the customer's, but they arrive from a browser.
 *
 * Checked before the value reaches a PostgREST filter, because `selectRows`
 * and `patchRows` both take a raw query string.
 */
const SLUG = /^[a-z0-9]{1,16}$/;

/** Longest editorial block we will render. Cut, not rejected. */
const MAX_PROSE = 1_200;
/** Most bullets or beats one candidate may carry. */
const MAX_ITEMS = 20;

/**
 * The words published under one cut.
 *
 * `story` and `beats` are held to what the script says. `reads` is our read of
 * the work and the page labels it as ours. They must not be merged, for the
 * same reason `why` and `projected` are two fields on a search result: these
 * are real experts' directions and a client decides on what it says. A team
 * never wrote down why it chose a direction, so a merged block would put our
 * reasoning in their mouth.
 */
export interface CandidateDetail {
  /** What happens in the cut, from the script. */
  story: string | null;
  /** Our read of what the direction is doing. Ours, and labelled so. */
  reads: string[];
  /** What the direction costs, one line. */
  trade: string | null;
  /** The beats, as written. `t` is seconds so the page can label them. */
  beats: { t: number; d: string }[];
  /** What was built for this direction. */
  built: string | null;
}

export interface Candidate {
  slug: string;
  /** How the cut is referred to elsewhere: "Team A". Must match the email. */
  label: string | null;
  title: string;
  kind: string | null;
  ledBy: string | null;
  sampleUrl: string;
  frames: Frame[] | null;
  detail: CandidateDetail | null;
  position: number;
  /** Set on exactly one candidate per order, once they have chosen. */
  chosenAt: string | null;
}

interface CandidateRow {
  slug: string;
  label: string | null;
  title: string;
  kind: string | null;
  led_by: string | null;
  sample_url: string;
  frames: unknown;
  detail: unknown;
  position: number;
  chosen_at: string | null;
}

const COLUMNS = 'slug,label,title,kind,led_by,sample_url,frames,detail,position,chosen_at';

function prose(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, MAX_PROSE);
  return text.length > 0 ? text : null;
}

function lines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value.slice(0, MAX_ITEMS)) {
    const text = prose(raw);
    if (text) out.push(text);
  }
  return out;
}

function beats(value: unknown): { t: number; d: string }[] {
  if (!Array.isArray(value)) return [];
  const out: { t: number; d: string }[] = [];
  for (const raw of value.slice(0, MAX_ITEMS)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const row = raw as Record<string, unknown>;
    const t = Number(row.t);
    const d = prose(row.d);
    if (!Number.isFinite(t) || t < 0 || !d) continue;
    out.push({ t, d });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Validated rather than trusted, exactly like `parseFrames`.
 *
 * This repo does not own the `mk_` tables and the column is free form jsonb, so
 * a bad row must render less rather than throw on a page somebody is waiting on.
 */
export function parseDetail(value: unknown): CandidateDetail | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const detail: CandidateDetail = {
    story: prose(row.story),
    reads: lines(row.reads),
    trade: prose(row.trade),
    beats: beats(row.beats),
    built: prose(row.built),
  };
  const empty =
    !detail.story && !detail.trade && !detail.built &&
    detail.reads.length === 0 && detail.beats.length === 0;
  return empty ? null : detail;
}

function toCandidate(row: CandidateRow): Candidate {
  return {
    slug: row.slug,
    label: row.label,
    title: row.title,
    kind: row.kind,
    ledBy: row.led_by,
    sampleUrl: row.sample_url,
    frames: parseFrames(row.frames),
    detail: parseDetail(row.detail),
    position: Number.isFinite(row.position) ? row.position : 0,
    chosenAt: row.chosen_at,
  };
}

/**
 * Every cut offered on this order, in the order the deck lettered them.
 *
 * An empty array and a failed read are both returned as `[]` on purpose. The
 * caller's next question is "is anybody being asked to choose here", and for a
 * page that must render either way the answer to that is no in both cases: the
 * order falls through to the single sample path it already had.
 */
export async function candidatesFor(orderId: string): Promise<Candidate[]> {
  if (!UUID.test(orderId)) return [];
  const rows = await selectRows<CandidateRow>(
    'mk_order_candidates',
    `select=${COLUMNS}&order_id=eq.${orderId}&order=position.asc&limit=8`,
  );
  if (!rows) return [];
  return rows.map(toCandidate);
}

/** The one they picked, or null while the choice is still open. */
export function chosen(candidates: Candidate[]): Candidate | null {
  return candidates.find((c) => c.chosenAt !== null) ?? null;
}

/** True when there are cuts here and nobody has picked one yet. */
export function awaitingChoice(candidates: Candidate[]): boolean {
  return candidates.length > 0 && chosen(candidates) === null;
}

export type ChooseResult =
  | { ok: true; candidate: Candidate }
  | { ok: false; error: string };

/**
 * Record which cut they are taking forward.
 *
 * Idempotent, and safe against two writes racing. Three things make that true
 * and none of them is a check in TypeScript:
 *
 *  - `chosen_at=is.null` is in the filter, so a second request updates no rows
 *    rather than overwriting the first answer with a later timestamp.
 *  - A partial unique index on `(order_id) where chosen_at is not null` means
 *    the database refuses a second cut on the same order outright.
 *  - The winner is read back rather than assumed. `patchRows` reports success
 *    for a PATCH that matched nothing, so believing it would let two tabs each
 *    be told they won.
 *
 * Ownership is the caller's job. This is reached only after `getOrderForEmail`
 * has already proved the order belongs to whoever is asking.
 */
export async function chooseCandidate(orderId: string, slug: string): Promise<ChooseResult> {
  if (!UUID.test(orderId)) return { ok: false, error: 'That order could not be found.' };
  if (!SLUG.test(slug)) return { ok: false, error: 'That is not one of the cuts on this order.' };

  const before = await candidatesFor(orderId);
  if (before.length === 0) return { ok: false, error: 'There is nothing to choose between yet.' };
  if (!before.some((c) => c.slug === slug)) {
    return { ok: false, error: 'That is not one of the cuts on this order.' };
  }

  const already = chosen(before);
  // Tapping the same cut twice is a success, not an error. Tapping the other
  // one after choosing is the interesting case, and it is answered with what
  // actually happened rather than with a failure the page cannot explain.
  if (already) {
    return already.slug === slug
      ? { ok: true, candidate: already }
      : { ok: false, error: `You have already chosen ${already.title}.` };
  }

  await patchRows(
    'mk_order_candidates',
    `order_id=eq.${orderId}&slug=eq.${encodeURIComponent(slug)}&chosen_at=is.null`,
    { chosen_at: new Date().toISOString() },
  );

  const after = await candidatesFor(orderId);
  const winner = chosen(after);
  if (!winner) return { ok: false, error: 'That did not save. Try again.' };
  if (winner.slug !== slug) return { ok: false, error: `You have already chosen ${winner.title}.` };
  return { ok: true, candidate: winner };
}

/**
 * Write the chosen cut into the ladder as an ordinary sample.
 *
 * This is what collapses the feature back into the code that already works.
 * From here on `mk_order_assets` resolves a `sample_url` and a frame list, so
 * SampleReview, the change request route, the revision counter, the operator
 * cockpit and the status emails all behave as they do on any other order and
 * none of them has to learn what a candidate is.
 *
 * `actor` names the customer because they caused it, from their own session.
 * It cannot disturb the revision count, which only counts `working` events.
 *
 * Called after the choice is already recorded, and its failure is deliberately
 * not fatal: the choice is the thing that must not be lost. If this write
 * fails the page still renders the right cut, because the page reads the
 * candidate directly, and the frames fall back the same way. Returning false
 * lets the caller log it without taking the customer's decision away.
 */
export async function publishChosenSample(
  orderId: string,
  candidate: Candidate,
  email: string,
): Promise<boolean> {
  if (!UUID.test(orderId)) return false;
  const written = await insertRows('mk_order_events', {
    order_id: orderId,
    status: 'sample_sent',
    note: `Chose ${candidate.title}`,
    actor: `customer:${email.trim().toLowerCase()}`,
    asset_url: candidate.sampleUrl,
    frames: candidate.frames && candidate.frames.length > 0 ? candidate.frames : null,
  });
  return written.ok;
}
