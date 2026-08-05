import { stripEmDashes } from '@/lib/humanize';
import type { Expert, ExpertRecord } from '@/lib/types';
import type { SerpResult } from '@/lib/serp';

// Eight rather than three. Three was a shortlist somebody read top to bottom;
// eight is a set they choose from, which is what makes the pick meaningful and
// what gives the outbound agents more than one shot at a reply.
export const MAX_EXPERTS = 8;

// Below this we broaden the search and rank again rather than showing a thin
// set. We never pad: two real people is an honest answer, and three invented
// ones is not.
export const MIN_EXPERTS = 3;

const MAX_WHY_CHARS = 280;
const MAX_PROJECTED_CHARS = 400;

/**
 * A link reduced to the parts that identify the same page.
 *
 * Only used for matching a pick back to the result it came from; the raw link
 * is what gets stored and clicked. Host case and a trailing slash are not
 * differences a person would recognise, and treating them as differences was
 * quietly costing us matches. The path is left alone otherwise, because two
 * profiles on one marketplace differ only there.
 */
export function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Shape the model's ranked picks into storable records.
 *
 * Drops malformed entries, attaches thumbnails from the raw results, caps at
 * eight, and guarantees exactly one top match. A pick with no link is dropped
 * outright now, where it used to survive with an empty one: the link is what
 * the dashboard sends somebody to, so a record without one is a person they
 * can never actually reach.
 */
export function finalizeExperts(ranked: unknown, raw: SerpResult[]): ExpertRecord[] {
  if (!Array.isArray(ranked)) return [];
  const byLink = new Map(raw.map((r) => [normalizeLink(r.link), r]));

  const records: ExpertRecord[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const item of ranked) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    const why = typeof e.why === 'string' ? e.why.trim() : '';
    const link = typeof e.link === 'string' ? normalizeLink(e.link) : '';
    if (!name || !why) continue;

    // The model is told to copy a link back verbatim, so anything it returns
    // that was not in the raw results is invented and the row goes.
    //
    // Matched on a normalised form, not the raw string. An exact comparison
    // threw away real people over a trailing slash or a capitalised host,
    // and it did it silently: the search simply returned fewer, which reads
    // as "nobody matched" rather than as a bug.
    const source = byLink.get(link);
    if (!source) {
      dropped += 1;
      continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);

    const projected = typeof e.projected === 'string' ? e.projected.trim() : '';

    records.push({
      slot: records.length + 1,
      name: name.slice(0, 60),
      country: typeof e.country === 'string' ? e.country.slice(0, 40) : '',
      flag: typeof e.flag === 'string' ? e.flag.slice(0, 8) : '',
      rating: typeof e.rating === 'number' && e.rating > 0 && e.rating <= 5 ? e.rating : null,
      reviews: typeof e.reviews === 'number' && e.reviews > 0 ? Math.round(e.reviews) : null,
      price: typeof e.price === 'string' && e.price.trim() ? e.price.slice(0, 30) : null,
      why: stripEmDashes(why.slice(0, MAX_WHY_CHARS)),
      projected: stripEmDashes(projected.slice(0, MAX_PROJECTED_CHARS)),
      source: source.source.slice(0, 40),
      // From the matched raw result, never from `e`. The model is not asked
      // for this and must not be able to set it, or the attribution it feeds
      // would be the model's guess rather than a record of what happened.
      engine: source.engine.slice(0, 20),
      // Same rule as `engine`, and for a sharper reason. This one is rendered,
      // so a model that could set it could award itself a verification badge
      // for somebody who has no GitHub account at all.
      code_verified: source.github !== undefined,
      photo: source.thumbnail,
      link: source.link,
      top_match: e.top_match === true,
    });
    if (records.length === MAX_EXPERTS) break;
  }

  // Loud on purpose. A silent drop is indistinguishable from a thin search,
  // and the only symptom is a set that is smaller than it should be.
  if (dropped > 0) {
    console.warn(`[midsesh:experts] dropped ${dropped} pick(s) with an unmatched link`);
  }

  const topCount = records.filter((r) => r.top_match).length;
  if (records.length > 0 && topCount !== 1) {
    records.forEach((r, i) => (r.top_match = i === 0));
  }
  return records;
}

/**
 * A record as a browser is allowed to see it.
 *
 * This function is the gate. Locked leaves `name`, `photo` and `link` as null
 * in the payload itself, so a signed-out response has nothing to un-blur, no
 * matter what the page does with it. Everything else stays: country, rating,
 * price, marketplace and both text blocks are what somebody chooses on, and
 * none of them says who this is.
 */
export function redactExpert(record: ExpertRecord, locked: boolean): Expert {
  return {
    id: `e${record.slot}`,
    slot: record.slot,
    name: locked ? null : record.name,
    country: record.country,
    flag: record.flag,
    rating: record.rating,
    reviews: record.reviews,
    price: record.price,
    why: record.why,
    projected: record.projected,
    source: record.source,
    code_verified: record.code_verified,
    photo: locked ? null : record.photo,
    link: locked ? null : record.link,
    top_match: record.top_match,
    locked,
  };
}

export function redactExperts(records: ExpertRecord[], locked: boolean): Expert[] {
  return records.map((r) => redactExpert(r, locked));
}
