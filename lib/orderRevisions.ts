import { selectRows } from '@/lib/supabase';
import { parseFrames, isFrameNote, type Frame, type FrameNote } from '@/lib/frames';

// What changed between one cut and the next, and what the customer said in
// between.
//
// This adds no table. `mk_order_events` already carries the sample on a
// `sample_sent` row and the customer's words on the `working` row that follows
// it, so a round of changes is a walk over the trail rather than a new record
// of one. The reason the order page cannot show this today is that
// `mk_order_assets` collapses the trail to the newest `sample_sent`: correct
// for "what are they watching now", and the exact reason version one vanishes
// the moment version two is uploaded.
//
// Server only, like lib/orderTracking.ts and lib/orderCandidates.ts, and for
// the same reason: it reads with the service key.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderRevisions is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Most events we will walk. A single order does not have more rounds than this. */
const MAX_EVENTS = 60;
/** Longest block of customer feedback we will render back to them. */
const MAX_FEEDBACK = 2_000;

/** One cut, as it was published. */
export interface RevisionCut {
  /** Which version this is, 1-based, counted over published samples. */
  version: number;
  url: string;
  frames: Frame[] | null;
  /** When it went out. */
  at: string;
}

/** One round: the cut they watched, what they said, and what we made of it. */
export interface Revision {
  /** 1-based, counted over rounds of customer feedback. */
  round: number;
  before: RevisionCut;
  feedback: {
    /**
     * The customer's own words.
     *
     * Taken from the structured `notes` where they exist and falling back to
     * the compiled `note`. The structured rows are what they typed; `note` is
     * that same text with our headings around it, written for an editor
     * reading it in an email rather than for the person who wrote it.
     */
     lines: FrameNote[];
    at: string;
  };
  /**
   * The cut that answered it, or null while it is still being made.
   *
   * Null is the normal state for the newest round, and the page renders it as
   * work in progress rather than hiding the round.
   */
  after: RevisionCut | null;
}

interface EventRow {
  status: string;
  note: string | null;
  notes: unknown;
  actor: string | null;
  asset_url: string | null;
  frames: unknown;
  created_at: string;
}

const COLUMNS = 'status,note,notes,actor,asset_url,frames,created_at';

/**
 * The structured notes on a customer event, validated rather than trusted.
 *
 * `mk_order_events` belongs to the orders repo, so a junk value has to render
 * nothing rather than throw on a page somebody is waiting on. Falls back to
 * the compiled prose, which is never structured but is always theirs.
 */
function feedbackLines(row: EventRow): FrameNote[] {
  if (Array.isArray(row.notes)) {
    const kept = row.notes.filter(isFrameNote).map((n) => ({
      frame: n.frame,
      text: n.text.slice(0, MAX_FEEDBACK),
    }));
    if (kept.length > 0) return kept;
  }
  const text = typeof row.note === 'string' ? row.note.trim() : '';
  if (!text) return [];
  return [{ frame: null, text: text.slice(0, MAX_FEEDBACK) }];
}

/** A customer wrote this row, rather than one of us. */
function fromCustomer(actor: string | null): boolean {
  return typeof actor === 'string' && actor.startsWith('customer:');
}

/**
 * Every round of changes on one order, oldest first.
 *
 * Empty means nobody has asked for changes yet, which is every order until it
 * happens. The page renders nothing extra in that case and behaves exactly as
 * it did before this file existed.
 *
 * Null is not returned for a Supabase failure: an empty trail and an
 * unreachable database both render the page without this section, and the
 * sample above it is read separately and already handles its own absence.
 */
export async function revisionsFor(orderId: string): Promise<Revision[]> {
  if (!UUID.test(orderId)) return [];

  const rows = await selectRows<EventRow>(
    'mk_order_events',
    `select=${COLUMNS}&order_id=eq.${orderId}` +
      `&order=created_at.asc&limit=${MAX_EVENTS}`,
  );
  if (!rows || rows.length === 0) return [];

  const out: Revision[] = [];
  // The cut currently on screen, which is what any feedback that follows is
  // about. Only a `sample_sent` row carrying a file moves it: an operator
  // note, an approval and a status nudge all leave it alone.
  let current: RevisionCut | null = null;
  let version = 0;
  // The round waiting for the cut that answers it. At most one is ever open,
  // because a second round of feedback cannot be given against a cut that has
  // not been sent yet.
  let open: Revision | null = null;

  for (const row of rows) {
    const isSample = row.status === 'sample_sent' && typeof row.asset_url === 'string';

    if (isSample) {
      // The same file sent twice is one version. Two cuts up for review write
      // one row each and the customer's choice writes a third carrying the
      // file they picked, so counting rows rather than files would number the
      // cut they chose as version two before anybody had changed anything.
      const same = current?.url === row.asset_url;
      const cut: RevisionCut = same
        ? current!
        : {
            version: ++version,
            url: row.asset_url!,
            frames: parseFrames(row.frames),
            at: row.created_at,
          };

      // A new file closes the round that was waiting for one.
      if (open && !same) {
        open.after = cut;
        open = null;
      }
      current = cut;
      continue;
    }

    // Changes asked for by the customer. Our own `working` rows move the order
    // back into the queue and are not a round: counting them would show
    // somebody a round of feedback they never gave.
    if (row.status === 'working' && fromCustomer(row.actor)) {
      if (!current) continue;
      const lines = feedbackLines(row);
      if (lines.length === 0) continue;
      open = {
        round: out.length + 1,
        before: current,
        feedback: { lines, at: row.created_at },
        after: null,
      };
      out.push(open);
    }
  }

  return out;
}
