import { describe, expect, it } from 'vitest';
import {
  FORMAT_STATUS_LABELS,
  PLANS,
  ownsPlan,
  planBySlug,
  plansForEmail,
  tierPrice,
} from '@/lib/plans';

describe('plans', () => {
  it('prices every tier in integer cents and renders them whole', () => {
    for (const plan of PLANS) {
      for (const tier of plan.tiers) {
        expect(Number.isInteger(tier.priceCents)).toBe(true);
        expect(tier.priceCents % 100).toBe(0);
        expect(tierPrice(tier)).toMatch(/^\$\d+$/);
      }
      expect(plan.tiers.filter((t) => t.start)).toHaveLength(1);
    }
  });

  it('gives every format a label the page can print and media it can show', () => {
    for (const plan of PLANS) {
      const slugs = new Set<string>();
      for (const f of plan.formats) {
        expect(slugs.has(f.slug)).toBe(false);
        slugs.add(f.slug);
        expect(FORMAT_STATUS_LABELS[f.status]).toBeTruthy();
        // A format on the page has to have something to play, or the claim
        // is a card with nothing behind it.
        expect(f.media).toBeTruthy();
        if (f.media.original) {
          // A creator's cut is credited and linked, never shown as ours. The
          // shortcode is the only variable in the link, so it is held to the
          // alphabet lib/references.ts allows.
          expect(f.status).toBe('reference');
          expect(f.media.original.by.length).toBeGreaterThan(0);
          expect(f.media.original.code).toMatch(/^[A-Za-z0-9_-]{5,20}$/);
        }
        expect(f.media.src.startsWith('/')).toBe(true);
        expect(f.media.poster.startsWith('/')).toBe(true);
      }
    }
  });

  it('belongs to one lowercase address, matched without regard to case', () => {
    const plan = planBySlug('mishq');
    expect(plan).not.toBeNull();
    expect(plan!.email).toBe(plan!.email.toLowerCase());
    expect(ownsPlan(plan!, 'AVPuri@gmail.com ')).toBe(true);
    expect(ownsPlan(plan!, 'someone@else.example')).toBe(false);
    expect(ownsPlan(plan!, null)).toBe(false);
    expect(plansForEmail('avpuri@gmail.com').map((p) => p.slug)).toEqual(['mishq']);
    expect(plansForEmail('nobody@example.com')).toEqual([]);
  });

  it('returns null for a slug that is not a plan', () => {
    expect(planBySlug('mishq/../admin')).toBeNull();
    expect(planBySlug('')).toBeNull();
  });
});
