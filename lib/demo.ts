import type { Brief, ChatMessage, ChatReply, ExpertRecord } from '@/lib/types';

// Scripted flow used when API keys are missing, so the site is fully
// testable before ANTHROPIC_API_KEY / SERPAPI_KEY are configured.

// The extra fields the dev flow returns. Demo replies are scripted, so they
// take the safe defaults: single-select chips, email-first ending, and no
// match line (there is no real match behind a demo reply). Email leads because
// a script cannot tell whether the work is code, and that is the case the
// prompt itself resolves to email.
const DEMO_EXTRAS = {
  chip_mode: 'single',
  primary_path: 'email',
  expert_signup: false,
  match_intro: '',
  match_confidence: '',
} as const;

export function demoChatReply(messages: ChatMessage[]): ChatReply {
  const userTurns = messages.filter((m) => m.role === 'user');
  if (userTurns.length <= 1) {
    return {
      ...DEMO_EXTRAS,
      reply: 'What should they deliver, in a sentence?',
      chips: [],
      done: false,
      brief: null,
    };
  }
  if (userTurns.length === 2) {
    return {
      ...DEMO_EXTRAS,
      reply: 'Budget and timeline?',
      chips: ['Under €5k', '€5–15k', 'Flexible'],
      done: false,
      brief: null,
    };
  }
  const brief: Brief = {
    expert_type: userTurns[0].content.slice(0, 120),
    domain: '',
    specifics: userTurns
      .slice(1)
      .map((m) => m.content)
      .join(' · ')
      .slice(0, 300),
    engagement: '',
    budget: userTurns[userTurns.length - 1].content.slice(0, 120),
    timeline: '',
    search_query: userTurns[0].content.split(/\s+/).slice(0, 4).join(' '),
  };
  return { ...DEMO_EXTRAS, reply: 'On it. Give me about 20 seconds.', chips: [], done: true, brief };
}

// Same idea for /stuck: a believable two-question intake without API keys.
// Plain language, so a non-technical founder follows along too.
export function demoDevChatReply(messages: ChatMessage[]): ChatReply {
  const userTurns = messages.filter((m) => m.role === 'user');
  if (userTurns.length <= 1) {
    return {
      ...DEMO_EXTRAS,
      reply: 'Which tool are you using, and what does it keep doing?',
      chips: ['Claude Code', 'Codex', 'Cursor', 'Windsurf'],
      done: false,
      brief: null,
    };
  }
  if (userTurns.length === 2) {
    return {
      ...DEMO_EXTRAS,
      reply: 'Want someone in your session now, or an intro later today?',
      chips: ['Right now', 'Later today'],
      done: false,
      brief: null,
    };
  }
  const brief: Brief = {
    expert_type: 'AI pair programmer',
    domain: userTurns[1].content.slice(0, 120),
    specifics: userTurns[0].content.slice(0, 300),
    engagement: userTurns[userTurns.length - 1].content.slice(0, 120),
    budget: '',
    timeline: '',
    search_query: 'AI coding help',
  };
  return {
    ...DEMO_EXTRAS,
    reply: 'On it. Finding someone who can jump in now.',
    chips: [],
    done: true,
    brief,
  };
}

// Six invented people, used only when the API keys are missing. These are the
// one place in the codebase where a biography may be made up, because nobody
// here is real: the names, the links and the histories are all fiction, which
// is exactly what the live path is forbidden from producing.
export function demoExperts(): ExpertRecord[] {
  const people: Omit<ExpertRecord, 'engine'>[] = [
    {
      slot: 1,
      name: 'Amira Hassan',
      country: 'Berlin, DE',
      flag: '🇩🇪',
      rating: 4.9,
      reviews: 127,
      price: '€9.5k fixed',
      why: 'Profile is built around German payment licensing, and leads with BaFin filings rather than general fintech consulting.',
      projected: 'On a licensing application the slow part is the AML policy pack, not the form itself. A profile weighted this way usually means that work is already in hand.',
      source: 'upwork.com',
      photo: '/avatars/a1.jpg',
      link: 'https://www.upwork.com/freelancers/~demo01',
      top_match: true,
    },
    {
      slot: 2,
      name: 'Jonas Weber',
      country: 'Munich, DE',
      flag: '🇩🇪',
      rating: 5.0,
      reviews: 84,
      price: '€120/hr',
      why: 'Listing is regulatory advisory rather than delivery, priced hourly and pitched at founding teams.',
      projected: 'The fit if you keep the application in-house and want a supervisor’s eye on it, rather than handing the whole filing over.',
      source: 'fiverr.com',
      photo: '/avatars/a2.jpg',
      link: 'https://www.fiverr.com/demo02',
      top_match: false,
    },
    {
      slot: 3,
      name: 'Priya Nair',
      country: 'Amsterdam, NL',
      flag: '🇳🇱',
      rating: 4.8,
      reviews: 61,
      price: '€95/hr',
      why: 'EMI and passporting work across the EU, with German-language filings named on the profile.',
      projected: 'Passporting is a different problem from a first licence, so this is the stronger pick if you already hold one somewhere in the EU.',
      source: 'toptal.com',
      photo: '/avatars/a3.jpg',
      link: 'https://www.toptal.com/resume/demo03',
      top_match: false,
    },
    {
      slot: 4,
      name: 'Tomas Novak',
      country: 'Prague, CZ',
      flag: '🇨🇿',
      rating: 4.7,
      reviews: 39,
      price: '€70/hr',
      why: 'Compliance documentation and policy writing, priced well below the others in this set.',
      projected: 'Worth a conversation if the filing itself is handled and what you actually need is the paperwork produced quickly.',
      source: 'upwork.com',
      photo: null,
      link: 'https://www.upwork.com/freelancers/~demo04',
      top_match: false,
    },
    {
      slot: 5,
      name: 'Sofia Lindqvist',
      country: 'Stockholm, SE',
      flag: '🇸🇪',
      rating: 4.9,
      reviews: 152,
      price: null,
      why: 'Financial services regulation across the Nordics, with no price listed on the profile.',
      projected: 'Nordic regulators are not BaFin, so the transferable part here is process rather than jurisdiction. Ask what they have done inside Germany.',
      source: 'upwork.com',
      photo: null,
      link: 'https://www.upwork.com/freelancers/~demo05',
      top_match: false,
    },
    {
      slot: 6,
      name: 'Daniel Okoro',
      country: 'London, UK',
      flag: '🇬🇧',
      rating: 4.6,
      reviews: 28,
      price: '€8k fixed',
      why: 'Fixed-price licensing support, fewer reviews than the rest of this set.',
      projected: 'A fixed price on work this open-ended usually means a tightly drawn scope. Worth reading what it excludes before comparing it to the hourly options.',
      source: 'fiverr.com',
      photo: null,
      link: 'https://www.fiverr.com/demo06',
      top_match: false,
    },
  ];

  // 'demo' is not a retrieval engine, and that is the point. Tagging these
  // explicitly keeps scripted profiles out of any comparison between the real
  // engines, where they would otherwise land under whichever name was default.
  return people.map((p) => ({ ...p, engine: 'demo' }));
}
