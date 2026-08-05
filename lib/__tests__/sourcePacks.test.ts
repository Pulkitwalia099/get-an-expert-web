import { describe, expect, it } from 'vitest';
import { classifyPack, packQueries } from '../sourcePacks';
import type { Brief } from '../types';

function brief(over: Partial<Brief> = {}): Brief {
  return {
    expert_type: '',
    domain: '',
    specifics: '',
    engagement: '',
    budget: '',
    timeline: '',
    search_query: '',
    ...over,
  };
}

describe('classifyPack', () => {
  it('routes an automation brief to the ai pack', () => {
    expect(classifyPack(brief({ expert_type: 'n8n automation engineer' }))).toBe('ai');
  });

  it('routes an AI deployment brief to the ai pack', () => {
    expect(classifyPack(brief({ expert_type: 'RAG pipeline and LLM deployment' }))).toBe('ai');
  });

  it('routes a video brief to the video pack', () => {
    expect(classifyPack(brief({ expert_type: 'YouTube video editor' }))).toBe('video');
  });

  it('routes a go to market brief to the marketing pack', () => {
    expect(classifyPack(brief({ expert_type: 'go to market and demand gen lead' }))).toBe(
      'marketing',
    );
  });

  it('routes an integration brief to the web pack', () => {
    expect(classifyPack(brief({ expert_type: 'Stripe API integration engineer' }))).toBe('web');
  });

  it('returns null for a category with no pack yet', () => {
    expect(classifyPack(brief({ expert_type: 'startup lawyer for a SAFE round' }))).toBeNull();
  });

  it('returns null for an empty brief', () => {
    expect(classifyPack(brief())).toBeNull();
  });

  // The bug this guards is the one app/api/presence/route.ts already warns
  // about: brief.domain is the customer's industry, so reading it here would
  // send a fintech company hiring an editor to a fintech pack. An AI startup
  // hiring an editor still needs an editor.
  it('does not let the customer industry outvote the work', () => {
    expect(
      classifyPack(brief({ expert_type: 'video editor', domain: 'AI automation startup' })),
    ).toBe('video');
  });

  it('reads search_query as well as expert_type', () => {
    expect(classifyPack(brief({ search_query: 'motion graphics reel' }))).toBe('video');
  });
});

describe('packQueries', () => {
  function hosts(pack: Parameters<typeof packQueries>[0], kw = 'video editor'): string[] {
    return packQueries(pack, kw).map((q) => q.source);
  }

  it('sends an ai brief to github', () => {
    expect(hosts('ai', 'rag pipeline')).toContain('github.com');
  });

  it('sends a video brief to the portfolio hosts', () => {
    expect(hosts('video')).toEqual(expect.arrayContaining(['behance.net', 'vimeo.com']));
  });

  it('sends a marketing brief to where those people publish', () => {
    expect(hosts('marketing', 'demand gen')).toContain('linkedin.com');
  });

  it('keeps the marketplace query for the web pack', () => {
    expect(hosts('web', 'stripe integration')).toContain('upwork.com');
  });

  it('falls back to the current three queries when no pack matches', () => {
    expect(hosts(null)).toEqual(['upwork.com', 'fiverr.com', 'web']);
  });

  it('puts the keywords into every query it builds', () => {
    for (const q of packQueries('video', 'motion designer')) {
      expect(q.q).toContain('motion designer');
    }
  });

  // Long queries find articles, short ones find people. serp.ts caps the
  // keyword string at 80 chars for that reason and the packs must not undo it
  // by pasting a paragraph in behind a site: operator.
  it('never builds a query longer than a search engine will use well', () => {
    const long = 'a'.repeat(400);
    for (const q of packQueries('ai', long)) {
      expect(q.q.length).toBeLessThanOrEqual(200);
    }
  });

  it('returns at least one query for every pack', () => {
    for (const pack of ['marketing', 'ai', 'video', 'web', null] as const) {
      expect(packQueries(pack, 'anything').length).toBeGreaterThan(0);
    }
  });
});
