import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  MAIN_SETUPS,
  SALE_ON,
  SALE_PRICE,
  currentPrice,
  getSetup,
  isSetupSlug,
  playerUrl,
} from '@/lib/setups';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('setup catalog', () => {
  it('has eleven setups with unique slugs', () => {
    expect(MAIN_SETUPS).toHaveLength(11);
    const slugs = MAIN_SETUPS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every setup a real TikTok, credit, and checklist', () => {
    for (const setup of MAIN_SETUPS) {
      expect(setup.tiktokId).toMatch(/^\d{15,22}$/);
      expect(setup.postUrl).toMatch(/^https:\/\/www\.tiktok\.com\/@[\w.]+\/video\/\d+$/);
      expect(setup.handle.startsWith('@')).toBe(true);
      expect(setup.views.length).toBeGreaterThan(1);
      expect(setup.thumb).toMatch(/^\/reels\/tt-\d+\.jpg$/);
      expect(setup.checklist.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('prices big setups at $75 and small ones at $35', () => {
    for (const setup of MAIN_SETUPS) {
      expect([35, 75]).toContain(setup.price);
    }
  });

  it('sells everything at the sale price while the sale runs', () => {
    expect(SALE_ON).toBe(true);
    expect(SALE_PRICE).toBe(11);
    for (const setup of MAIN_SETUPS) {
      expect(currentPrice(setup)).toBe(11);
    }
  });

  // The card and the detail sheet used to print "$11" as literal text while
  // the cart and the totals called currentPrice. They agreed only because the
  // sale is on. Turning SALE_ON off would have advertised $11 and charged $75.
  // There is no DOM test setup in this project, so the guard reads the source.
  it('never hardcodes the sale price in a component', () => {
    const dir = path.join(root, 'components', 'setups');
    for (const file of ['ReelCard.tsx', 'DetailSheet.tsx']) {
      const source = readFileSync(path.join(dir, file), 'utf8');
      const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, `${file} should price from currentPrice()`).toContain('currentPrice(setup)');
      expect(code, `${file} still has a literal $${SALE_PRICE}`).not.toMatch(
        new RegExp(`\\$\\{?${SALE_PRICE}\\b`),
      );
    }
  });

  it('builds the autoplaying TikTok player url', () => {
    expect(playerUrl('123')).toBe(
      'https://www.tiktok.com/player/v1/123?autoplay=1&loop=1&controls=1&rel=0&description=0',
    );
  });

  it('looks up setups by slug', () => {
    expect(getSetup('openclaw')?.title).toContain('OpenClaw');
    expect(getSetup('nope')).toBeUndefined();
    expect(isSetupSlug('vibe-coding')).toBe(true);
    expect(isSetupSlug('cold-caller')).toBe(false);
  });

  it('keeps copy free of em dashes', () => {
    for (const setup of MAIN_SETUPS) {
      const text = [setup.title, setup.caption, ...setup.checklist].join(' ');
      expect(text.includes('—')).toBe(false);
    }
  });
});
