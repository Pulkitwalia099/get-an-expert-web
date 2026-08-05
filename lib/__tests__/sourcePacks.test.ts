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

  // Architecture and the physical trades are the honest edge of the taxonomy:
  // Upwork lists them, this site does not search for them, and generic is the
  // right answer rather than a pack invented to look complete.
  it('returns null for work no pack covers', () => {
    expect(classifyPack(brief({ expert_type: 'structural engineer for a house extension' }))).toBeNull();
  });

  // The real search that went wrong. A UGC creator films themselves holding a
  // product for paid social. That is not the same job as cutting a showreel,
  // and it is not found in the same places: the video pack's first query is
  // site:behance.net, which is a design portfolio site, and it returned seven
  // AI video artists and no UGC creators.
  it('routes a UGC brief to the ugc pack rather than to video', () => {
    expect(classifyPack(brief({ expert_type: 'UGC content creator' }))).toBe('ugc');
  });

  // The exact brief from the failed search. One broad word, "AI", used to tie
  // with the specific one and win on list order alone, which sent a search for
  // a UGC creator to github.com and huggingface.co.
  it('is not derailed by a broad word sitting next to a specific one', () => {
    expect(
      classifyPack(
        brief({ expert_type: 'UGC AI content creator', search_query: 'UGC content creator' }),
      ),
    ).toBe('ugc');
  });

  it('still routes a genuine AI brief to the ai pack', () => {
    expect(classifyPack(brief({ expert_type: 'AI engineer for a RAG chatbot' }))).toBe('ai');
  });

  // Two broad words from two packs and nothing specific. Picking one silently
  // is how a video brief ended up searching GitHub, and generic is the honest
  // answer: it means "nothing here is decisive", not "no idea".
  it('falls through to generic when two packs tie on broad words alone', () => {
    expect(classifyPack(brief({ expert_type: 'video automation' }))).toBeNull();
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

  // Proven on production: the generic pack returned eight real UGC creators
  // from Fiverr for this brief while the video pack returned seven Behance
  // portfolios and none. So the ugc pack is built on the hosts that worked.
  it('sends a ugc brief to the marketplaces those creators actually sell on', () => {
    expect(hosts('ugc', 'UGC creator')).toEqual(
      expect.arrayContaining(['fiverr.com', 'upwork.com']),
    );
  });

  it('does not send a ugc brief to a design portfolio site', () => {
    expect(hosts('ugc', 'UGC creator')).not.toContain('behance.net');
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

// Coverage across the categories people actually hire for on Upwork and
// Fiverr. "No pack" was designed as the honest answer for work nobody had
// mapped yet, and it had quietly become the answer for most of the market:
// four packs against roughly a dozen top-level categories on both
// marketplaces. A pack now runs beside the generic hosts rather than instead
// of them, so adding one can only add places to look, which is what makes it
// safe to cover the whole taxonomy rather than waiting for each one to fail.
describe('pack coverage across the marketplaces', () => {
  it.each([
    ['logo and brand identity designer', 'design'],
    ['UI and UX designer', 'design'],
    ['technical writer for developer documentation', 'writing'],
    ['SEO blog content writer', 'writing'],
    ['English to Spanish translator', 'writing'],
    ['data analyst building Looker dashboards', 'data'],
    ['data annotation and labelling specialist', 'data'],
    ['podcast audio engineer', 'audio'],
    ['voiceover artist', 'audio'],
    ['penetration tester for a web app', 'security'],
    ['SOC 2 compliance engineer', 'security'],
    ['fractional CFO', 'professional'],
    ['startup lawyer for a SAFE round', 'professional'],
    ['bookkeeper for monthly close', 'professional'],
    ['virtual assistant for inbox and calendar', 'admin'],
    ['customer support agent for Zendesk', 'admin'],
  ])('routes "%s" to the %s pack', (expert_type, pack) => {
    expect(classifyPack(brief({ expert_type }))).toBe(pack);
  });

  // The packs that already existed must not be pulled apart by the new ones.
  it.each([
    ['n8n automation engineer', 'ai'],
    ['RAG pipeline and LLM deployment', 'ai'],
    ['YouTube video editor', 'video'],
    ['go to market and demand gen lead', 'marketing'],
    ['Stripe API integration engineer', 'web'],
    ['UGC content creator', 'ugc'],
  ])('still routes "%s" to the %s pack', (expert_type, pack) => {
    expect(classifyPack(brief({ expert_type }))).toBe(pack);
  });
});

describe('where each pack looks', () => {
  function hostsFor(pack: Parameters<typeof packQueries>[0]): string[] {
    return packQueries(pack, 'anything').map((q) => q.source);
  }

  it.each([
    ['design', 'dribbble.com'],
    ['writing', 'substack.com'],
    ['data', 'kaggle.com'],
    ['audio', 'soundbetter.com'],
    ['security', 'github.com'],
    ['professional', 'linkedin.com'],
    ['admin', 'linkedin.com'],
  ] as const)('sends a %s brief to %s', (pack, host) => {
    expect(hostsFor(pack)).toContain(host);
  });

  it('gives every pack at least one query and no empty source', () => {
    const packs = [
      'marketing', 'writing', 'ai', 'data', 'ugc', 'video',
      'audio', 'design', 'web', 'security', 'professional', 'admin', null,
    ] as const;
    for (const pack of packs) {
      const qs = packQueries(pack, 'freelance expert');
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) expect(q.source.length).toBeGreaterThan(0);
    }
  });
});
