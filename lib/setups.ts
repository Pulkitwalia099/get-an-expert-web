export const SALE_ON = true;
export const SALE_PRICE = 11;

export interface Setup {
  slug: string;
  title: string;
  price: number;
  minutes: number;
  views: string;
  handle: string;
  tiktokId: string;
  postUrl: string;
  thumb: string;
  caption: string;
  checklist: string[];
  badge?: string;
}

const post = (handle: string, id: string): string =>
  `https://www.tiktok.com/@${handle}/video/${id}`;

// TikTok's official embed player; autoplays muted on mount, so one tap on a
// card starts the video. Sound is one more tap on the player's own control.
export function playerUrl(tiktokId: string): string {
  return `https://www.tiktok.com/player/v1/${tiktokId}?autoplay=1&loop=1&controls=1&rel=0&description=0`;
}

// One card per viral setup. All TikTok, all English audio, checked one by one
// on 2026-07-26; play counts scraped the same day. Sources, alternates, and
// the audit trail live in design/setups-reels.md.
export const MAIN_SETUPS: Setup[] = [
  {
    slug: 'claude-code-free',
    title: 'Run Claude Code free',
    price: 35,
    minutes: 60,
    views: '8.7K',
    handle: '@build.with.alan',
    tiktokId: '7664566281219181845',
    postUrl: post('build.with.alan', '7664566281219181845'),
    thumb: '/reels/tt-7664566281219181845.jpg',
    caption: 'OmniRoute connects Claude Code to 200+ providers. 1.6 billion free tokens a month.',
    checklist: [
      'Claude Code running in your terminal at zero API cost',
      'OmniRoute wired to 200+ providers with free-tier routing',
      'Fallback models set up for when limits hit',
      'A cheat sheet of the commands you will use daily',
    ],
  },
  {
    slug: 'motion-website',
    title: '3D motion website',
    price: 75,
    minutes: 90,
    views: '165K',
    handle: '@webloved',
    tiktokId: '7641650573510511905',
    postUrl: post('webloved', '7641650573510511905'),
    thumb: '/reels/tt-7641650573510511905.jpg',
    caption: 'Use Three.js to render any product in a real-time 3D site. Built with Claude.',
    checklist: [
      'A live site with real-time 3D motion like the video',
      'Your copy, brand colors, and domain wired in',
      'Runs fast on phones, where your visitors are',
      'You watch the build and learn to edit it yourself',
    ],
  },
  {
    slug: 'voice-clone',
    title: 'Your voice, cloned',
    price: 35,
    minutes: 60,
    views: '31.7K',
    handle: '@sabrina_ramonov',
    tiktokId: '7514815469245811999',
    postUrl: post('sabrina_ramonov', '7514815469245811999'),
    thumb: '/reels/tt-7514815469245811999.jpg',
    caption: 'Your ElevenLabs voice clone, done right. Quality recording in, your voice out.',
    checklist: [
      'Your voice cloned from a clean recording session',
      'Mic and room setup so the clone sounds like you',
      'Scripts to voiceover in one paste',
      'Consent and takedown basics explained plainly',
    ],
  },
  {
    slug: 'linkedin-voice',
    title: 'LinkedIn, in your voice',
    price: 75,
    minutes: 90,
    views: '2.7K',
    handle: '@duncanrogoff',
    tiktokId: '7519724207526235405',
    postUrl: post('duncanrogoff', '7519724207526235405'),
    thumb: '/reels/tt-7519724207526235405.jpg',
    caption: 'This automation writes all my LinkedIn content. I have not written a post in 3 months.',
    checklist: [
      'A workflow that drafts posts in your tone, not template tone',
      'Trained on your past posts and the voices you admire',
      'Drafts land for your approval, nothing posts on its own',
      'Posting cadence and timing set up with you',
    ],
  },
  {
    slug: 'post-everywhere',
    title: 'Post once, everywhere',
    price: 75,
    minutes: 90,
    views: '176K',
    handle: '@mattfarmerai',
    tiktokId: '7471915642975702277',
    postUrl: post('mattfarmerai', '7471915642975702277'),
    thumb: '/reels/tt-7471915642975702277.jpg',
    caption: 'Blotato: create content for every platform at once.',
    checklist: [
      'One post fans out to Instagram, X, LinkedIn, and TikTok',
      'Each platform gets a native version, not a copy paste',
      'Connected to your accounts with a kill switch',
      'A dry run together before it goes live',
    ],
  },
  {
    slug: 'chief-of-staff',
    title: 'AI chief of staff',
    price: 75,
    minutes: 90,
    views: '18.5K',
    handle: '@jessieyo03',
    tiktokId: '7628390814288301325',
    postUrl: post('jessieyo03', '7628390814288301325'),
    thumb: '/reels/tt-7628390814288301325.jpg',
    caption: 'How I made an AI Chief of Staff.',
    checklist: [
      'A daily brief of your inbox, calendar, and open loops',
      'Email triage that flags what actually needs you',
      'Meeting prep pulled together before you ask',
      'Runs on your accounts with limits you control',
    ],
  },
  {
    slug: 'no-ai-slop',
    title: 'Writing with no AI slop',
    price: 35,
    minutes: 60,
    views: '11.3M',
    handle: '@nathanespinoza',
    tiktokId: '7436446827244834090',
    postUrl: post('nathanespinoza', '7436446827244834090'),
    thumb: '/reels/tt-7436446827244834090.jpg',
    caption: 'The best AI humanizer. ChatGPT that reads human.',
    badge: 'Most viewed',
    checklist: [
      'A writing setup that strips the tells: em dashes, hype, filler',
      'Your own banned list and style rules wired into every draft',
      'Works in ChatGPT, Claude, or wherever you write',
      'Before and after passes on three of your real drafts',
    ],
  },
  {
    slug: 'ai-support',
    title: 'AI customer support',
    price: 75,
    minutes: 90,
    views: '64.4K',
    handle: '@jakerosenthal_',
    tiktokId: '7361876524783389957',
    postUrl: post('jakerosenthal_', '7361876524783389957'),
    thumb: '/reels/tt-7361876524783389957.jpg',
    caption: 'No more waiting on hold. The Bland AI phone demo everyone shared.',
    checklist: [
      'A support agent trained on your docs and past tickets',
      'Answers calls and chat on your site or WhatsApp',
      'Hands off to a human the moment it is unsure',
      'A weekly digest of what customers asked',
    ],
  },
  {
    slug: 'openclaw',
    title: 'OpenClaw, set up for you',
    price: 75,
    minutes: 90,
    views: '151K',
    handle: '@willfrancis24',
    tiktokId: '7617973289457077526',
    postUrl: post('willfrancis24', '7617973289457077526'),
    thumb: '/reels/tt-7617973289457077526.jpg',
    caption: 'Your own AI assistant running 24/7. OpenClaw set up in minutes, no terminal.',
    badge: 'Trending',
    checklist: [
      'OpenClaw running 24/7 on your Mac, mini PC, or a small server',
      'Connected to WhatsApp or Telegram, so you text it like a person',
      'Claude wired in with your own API key and spending caps',
      'Safety limits, backups, and a 15 minute handover tour',
    ],
  },
  {
    slug: 'ollama',
    title: 'Ollama, private AI at home',
    price: 35,
    minutes: 60,
    views: '345K',
    handle: '@vasilijnevlev',
    tiktokId: '7604531198072786209',
    postUrl: post('vasilijnevlev', '7604531198072786209'),
    thumb: '/reels/tt-7604531198072786209.jpg',
    caption: 'Install Ollama and Claude Code. Local coding unlocked, step by step.',
    checklist: [
      'Ollama installed with models matched to your hardware',
      'A private chat app, nothing leaves your machine',
      'Wired into your editor or terminal if you code',
      'A model update routine you can run yourself',
    ],
  },
  {
    slug: 'vibe-coding',
    title: 'The vibe coding setup',
    price: 35,
    minutes: 90,
    views: '224K',
    handle: '@sina.growthtech',
    tiktokId: '7539706889878179102',
    postUrl: post('sina.growthtech', '7539706889878179102'),
    thumb: '/reels/tt-7539706889878179102.jpg',
    caption: 'Exactly how to vibecode your first app in 7 days.',
    checklist: [
      'Cursor or Claude Code installed and configured properly',
      'The prompts, rules, and shortcuts that make it click',
      'Your first project scaffolded and deployed together',
      'A workflow tour recorded so you can rewatch it',
    ],
  },
];

const BY_SLUG = new Map(MAIN_SETUPS.map((s) => [s.slug, s]));

export function getSetup(slug: string): Setup | undefined {
  return BY_SLUG.get(slug);
}

export function isSetupSlug(value: string): boolean {
  return BY_SLUG.has(value);
}

export function currentPrice(setup: Setup): number {
  return SALE_ON ? SALE_PRICE : setup.price;
}
