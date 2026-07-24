import { stripEmDashes } from '@/lib/humanize';
import type { Expert } from '@/lib/types';
import type { SerpResult } from '@/lib/serp';

const MAX_EXPERTS = 3;
const MAX_WHY_CHARS = 280;

// Shape the model's ranked picks into render-ready experts: drop malformed
// entries, attach thumbnails from the raw results, cap at 3, and guarantee
// exactly one top match.
export function finalizeExperts(ranked: unknown, raw: SerpResult[]): Expert[] {
  if (!Array.isArray(ranked)) return [];
  const byLink = new Map(raw.map((r) => [r.link, r]));

  const experts: Expert[] = [];
  for (const item of ranked) {
    if (typeof item !== 'object' || item === null) continue;
    const e = item as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    const why = typeof e.why === 'string' ? e.why.trim() : '';
    if (!name || !why) continue;

    const link = typeof e.link === 'string' ? e.link : '';
    experts.push({
      id: `e${experts.length + 1}`,
      name: name.slice(0, 60),
      country: typeof e.country === 'string' ? e.country.slice(0, 40) : '',
      flag: typeof e.flag === 'string' ? e.flag.slice(0, 8) : '',
      rating: typeof e.rating === 'number' && e.rating > 0 && e.rating <= 5 ? e.rating : null,
      reviews: typeof e.reviews === 'number' && e.reviews > 0 ? Math.round(e.reviews) : null,
      price: typeof e.price === 'string' && e.price.trim() ? e.price.slice(0, 30) : null,
      why: stripEmDashes(why.slice(0, MAX_WHY_CHARS)),
      source: typeof e.source === 'string' ? e.source.slice(0, 40) : '',
      photo: byLink.get(link)?.thumbnail ?? null,
      top_match: e.top_match === true,
    });
    if (experts.length === MAX_EXPERTS) break;
  }

  const topCount = experts.filter((e) => e.top_match).length;
  if (experts.length > 0 && topCount !== 1) {
    experts.forEach((e, i) => (e.top_match = i === 0));
  }
  return experts;
}
