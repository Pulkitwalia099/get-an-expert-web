// The start dates a plan can begin on.
//
// Four options, three days apart, starting three days out. Browser safe: the
// chooser renders these and the route checks what comes back against the same
// arithmetic, so the two cannot disagree about which dates were on offer.
//
// Dates are handled as calendar days in UTC, never as instants. A start date
// is a day somebody picks, and "which day" must not shift because the server
// and the browser are in different time zones. The route allows one day of
// slack either side for the same reason.

export const START_OPTIONS = 4;
export const START_STEP_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StartOption {
  /** YYYY-MM-DD. What is sent and stored. */
  iso: string;
  /** "Fri 18 Sep". What is shown. */
  label: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayStart(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function labelFor(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The dates on offer, given today. */
export function startOptions(now: Date = new Date()): StartOption[] {
  const base = dayStart(now);
  const out: StartOption[] = [];
  for (let i = 1; i <= START_OPTIONS; i++) {
    const iso = isoDay(base + i * START_STEP_DAYS * DAY_MS);
    out.push({ iso, label: labelFor(iso) });
  }
  return out;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A start date the route accepts, or null.
 *
 * It has to be a real day in the window the options span, with one day of
 * slack at each end so a browser a time zone ahead of the server is not
 * refused for picking the first option at midnight.
 */
export function parseStartOn(input: unknown, now: Date = new Date()): string | null {
  if (typeof input !== 'string' || !ISO_RE.test(input)) return null;
  const ms = Date.parse(`${input}T00:00:00Z`);
  if (Number.isNaN(ms) || isoDay(ms) !== input) return null;
  const base = dayStart(now);
  const first = base + (START_STEP_DAYS - 1) * DAY_MS;
  const last = base + (START_OPTIONS * START_STEP_DAYS + 1) * DAY_MS;
  return ms >= first && ms <= last ? input : null;
}
