// Which places to search, per kind of work.
//
// Split out of lib/sourcePacks.ts when the pack list grew past the point where
// the data and the scoring could share a file under 400 lines. This file is
// data only: the scoring, the tie rule and the query builder all live next
// door, and nothing here imports anything.
//
// Two rules govern every entry.
//
// Strong keywords name a trade and little else. Weak keywords point here but
// are common enough to appear in any brief. The split exists because of a real
// failed search: "UGC AI content creator" scored one for ugc and one for ai,
// tied, and the tie went to whichever pack happened to be listed first, which
// put a search for somebody who films product videos one word away from
// running against github.com. One broad word must never cancel one precise one.
//
// And a pack runs beside the generic marketplaces rather than instead of them,
// so every entry here can only add somewhere to look. That is what makes it
// safe to cover the whole marketplace taxonomy up front instead of waiting for
// each category to fail in production the way UGC did.

export type PackKey =
  | 'marketing'
  | 'writing'
  | 'ai'
  | 'data'
  | 'ugc'
  | 'video'
  | 'audio'
  | 'design'
  | 'web'
  | 'security'
  | 'professional'
  | 'admin';

export interface Pack {
  key: PackKey;
  /** Names this trade and little else. Worth two points. */
  keywords: string[];
  /** Points here but appears anywhere. Worth one point. */
  weak?: string[];
}

export const PACKS: Pack[] = [
  {
    key: 'marketing',
    keywords: [
      'gtm', 'go to market', 'demand gen', 'demand generation', 'cold email',
      'seo', 'paid ads', 'ppc', 'google ads', 'meta ads', 'performance marketing',
      'positioning', 'brand strategy', 'hubspot', 'klaviyo', 'email marketing',
      'social media', 'conversion rate', 'community manager',
    ],
    weak: ['growth', 'lifecycle', 'outbound', 'crm', 'ads', 'marketing'],
  },
  {
    key: 'writing',
    keywords: [
      'copywriter', 'copywriting', 'content writer', 'ghostwriter', 'ghostwriting',
      'technical writer', 'technical writing', 'translator', 'translation',
      'proofreader', 'proofreading', 'blog', 'article writing', 'scriptwriter',
      'screenwriter', 'localisation', 'localization', 'whitepaper',
    ],
    weak: ['writer', 'writing', 'content'],
  },
  {
    key: 'ai',
    keywords: [
      'llm', 'n8n', 'zapier', 'make.com', 'rag', 'prompt', 'openai', 'claude',
      'chatbot', 'mlops', 'fine-tune', 'fine tune', 'machine learning',
    ],
    // 'ai' is the word half the internet uses about itself now. On its own it
    // says the visitor works in this decade, not that the job is AI engineering.
    weak: ['ai', 'agent', 'automation', 'automate', 'workflow'],
  },
  {
    key: 'data',
    keywords: [
      'data analyst', 'data science', 'data scientist', 'data engineer', 'looker',
      'tableau', 'power bi', 'bigquery', 'snowflake', 'dbt', 'etl',
      'data annotation', 'data labelling', 'data labeling', 'labelling',
      'labeling', 'sql', 'web scraping', 'scraping',
    ],
    weak: ['data', 'analytics', 'analysis', 'dashboard'],
  },
  {
    // Somebody who films themselves holding a product for paid social. Not a
    // post-production job, which is why sharing a pack with Video sent a real
    // search to behance.net and returned seven AI video artists and no UGC.
    key: 'ugc',
    keywords: [
      'ugc', 'user generated content', 'user-generated content', 'testimonial video',
      'spokesperson', 'influencer', 'product demo video', 'unboxing',
    ],
    weak: ['creator', 'testimonial'],
  },
  {
    key: 'video',
    keywords: [
      'youtube', 'shorts', 'reel', 'reels', 'tiktok', 'motion graphics',
      'motion design', 'after effects', 'premiere', 'davinci', 'color grade',
      'color grading', 'vfx', 'explainer video',
    ],
    weak: ['video', 'editor', 'editing', 'animation'],
  },
  {
    key: 'audio',
    keywords: [
      'podcast', 'voiceover', 'voice over', 'voice actor', 'audio engineer',
      'mixing', 'mastering', 'sound design', 'music production', 'jingle',
      'dubbing', 'audiobook',
    ],
    weak: ['audio', 'sound', 'music'],
  },
  {
    key: 'design',
    keywords: [
      'logo', 'brand identity', 'graphic design', 'graphic designer', 'ui', 'ux',
      'figma', 'illustration', 'illustrator', 'packaging design', 'web design',
      'product design', 'typography', 'print design', 'presentation design',
    ],
    weak: ['design', 'designer', 'branding', 'brand'],
  },
  {
    key: 'web',
    keywords: [
      'webhook', 'stripe', 'backend', 'frontend', 'full stack', 'fullstack',
      'devops', 'postgres', 'supabase', 'react', 'next.js', 'mobile app',
      'wordpress', 'shopify', 'kubernetes', 'webflow', 'squarespace',
    ],
    weak: ['api', 'apis', 'integration', 'integrations', 'cloud', 'deployment', 'database', 'website', 'developer'],
  },
  {
    key: 'security',
    keywords: [
      'penetration test', 'penetration tester', 'pentest', 'security audit',
      'soc 2', 'soc2', 'iso 27001', 'vulnerability', 'appsec', 'infosec',
      'security engineer', 'owasp', 'threat model',
    ],
    // 'compliance' sits here and in professional on purpose. On its own it is
    // genuinely ambiguous between a security audit and a financial filing, so
    // it ties, and a tie falls through to the generic marketplaces.
    weak: ['security', 'compliance'],
  },
  {
    key: 'professional',
    keywords: [
      'cfo', 'fractional cfo', 'bookkeeper', 'bookkeeping', 'accountant',
      'accounting', 'financial model', 'financial modelling', 'financial modeling',
      'lawyer', 'attorney', 'legal counsel', 'contract review', 'incorporation',
      'trademark', 'recruiter', 'recruiting', 'payroll', 'tax return',
    ],
    weak: ['finance', 'financial', 'legal', 'compliance', 'hr'],
  },
  {
    key: 'admin',
    keywords: [
      'virtual assistant', 'executive assistant', 'customer support',
      'customer service', 'zendesk', 'intercom', 'data entry', 'project manager',
      'project management', 'inbox management', 'operations manager',
      'appointment setting',
    ],
    weak: ['admin', 'assistant', 'support'],
  },
];

export interface Template {
  /** Built from the keyword string only. Never from brief.specifics. */
  build: (kw: string) => string;
  source: string;
}

// Today's queries, unchanged, and now the floor under every search rather than
// only the answer for briefs nothing matched.
export const FALLBACK: Template[] = [
  { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
  { build: (kw) => `site:fiverr.com ${kw}`, source: 'fiverr.com' },
  { build: (kw) => `${kw} freelance consultant profile`, source: 'web' },
];

export const TEMPLATES: Record<PackKey, Template[]> = {
  // GTM people are found by what they published, not by a gig listing.
  marketing: [
    { build: (kw) => `site:linkedin.com/in ${kw} freelance consultant`, source: 'linkedin.com' },
    { build: (kw) => `site:substack.com ${kw}`, source: 'substack.com' },
    { build: (kw) => `${kw} freelance consultant case study`, source: 'web' },
  ],
  writing: [
    { build: (kw) => `site:linkedin.com/in ${kw} freelance`, source: 'linkedin.com' },
    { build: (kw) => `site:substack.com ${kw}`, source: 'substack.com' },
    { build: (kw) => `${kw} freelance writer portfolio clips`, source: 'web' },
  ],
  // The one category where the claim can be checked against the work.
  ai: [
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `site:huggingface.co ${kw}`, source: 'huggingface.co' },
    { build: (kw) => `${kw} freelance engineer portfolio`, source: 'web' },
  ],
  data: [
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `site:kaggle.com ${kw}`, source: 'kaggle.com' },
    { build: (kw) => `${kw} freelance analyst portfolio`, source: 'web' },
  ],
  // Measured, not guessed. On the search that went wrong, the generic pack
  // returned eight real UGC creators from Fiverr while the video pack returned
  // seven Behance portfolios and no UGC at all.
  ugc: [
    { build: (kw) => `site:fiverr.com ${kw}`, source: 'fiverr.com' },
    { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
    { build: (kw) => `site:instagram.com ${kw}`, source: 'instagram.com' },
  ],
  // The work is the portfolio, and editors keep theirs in two places.
  video: [
    { build: (kw) => `site:behance.net ${kw}`, source: 'behance.net' },
    { build: (kw) => `site:vimeo.com ${kw}`, source: 'vimeo.com' },
    { build: (kw) => `${kw} showreel portfolio freelance`, source: 'web' },
  ],
  audio: [
    { build: (kw) => `site:soundbetter.com ${kw}`, source: 'soundbetter.com' },
    { build: (kw) => `site:soundcloud.com ${kw}`, source: 'soundcloud.com' },
    { build: (kw) => `${kw} freelance audio engineer portfolio`, source: 'web' },
  ],
  design: [
    { build: (kw) => `site:dribbble.com ${kw}`, source: 'dribbble.com' },
    { build: (kw) => `site:behance.net ${kw}`, source: 'behance.net' },
    { build: (kw) => `${kw} freelance designer portfolio`, source: 'web' },
  ],
  // Google's index of Upwork developer profiles is genuinely good, and this is
  // the category it is good at.
  web: [
    { build: (kw) => `site:upwork.com/freelancers ${kw}`, source: 'upwork.com' },
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `${kw} freelance developer portfolio`, source: 'web' },
  ],
  security: [
    { build: (kw) => `site:github.com ${kw}`, source: 'github.com' },
    { build: (kw) => `site:hackerone.com ${kw}`, source: 'hackerone.com' },
    { build: (kw) => `${kw} freelance security consultant`, source: 'web' },
  ],
  // Fractional finance and legal people do not keep gig listings. They keep a
  // LinkedIn profile and a site, and the marketplaces ride along underneath.
  professional: [
    { build: (kw) => `site:linkedin.com/in ${kw} fractional`, source: 'linkedin.com' },
    { build: (kw) => `${kw} freelance advisor for startups`, source: 'web' },
  ],
  admin: [
    { build: (kw) => `site:linkedin.com/in ${kw} freelance`, source: 'linkedin.com' },
    { build: (kw) => `${kw} freelance virtual assistant`, source: 'web' },
  ],
};
