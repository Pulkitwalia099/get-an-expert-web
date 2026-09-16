// The start dates a plan can begin on.
//
// Four options, three days apart, from a first date the plan names. Anchored
// to the plan rather than to the clock, because "the 22nd" was agreed on a
// call and a picker that drifted a day later would offer a date nobody
// discussed. When the first date is behind us the operator moves it in
// lib/plans.ts; until then the server and the browser compute the same four
// days from the same string and cannot disagree.
//
// Dates are handled as calendar days, never as instants. A start date is a
// day somebody picks, and "which day" must not shift because the server and
// the browser are in different time zones.

export const START_OPTIONS = 4;
export const START_STEP_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StartOption {
  /** YYYY-MM-DD. What is sent and stored. */
  iso: string;
  /** "Tue 22 Sep". What is shown. */
  label: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The day as a UTC midnight, or null when the string is not a real date. */
function dayMs(iso: string): number | null {
  if (!ISO_RE.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) || isoDay(ms) !== iso ? null : ms;
}

export function labelFor(iso: string): string {
  const ms = dayMs(iso);
  if (ms === null) return iso;
  const d = new Date(ms);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The dates on offer, from the plan's first date. Empty when that date is malformed. */
export function startOptions(from: string): StartOption[] {
  const base = dayMs(from);
  if (base === null) return [];
  const out: StartOption[] = [];
  for (let i = 0; i < START_OPTIONS; i++) {
    const iso = isoDay(base + i * START_STEP_DAYS * DAY_MS);
    out.push({ iso, label: labelFor(iso) });
  }
  return out;
}

/** A start date the route accepts: exactly one of the options, or null. */
export function parseStartOn(input: unknown, from: string): string | null {
  if (typeof input !== 'string') return null;
  return startOptions(from).some((o) => o.iso === input) ? input : null;
}
