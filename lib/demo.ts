import type { Brief, ChatMessage, ChatReply, Expert } from '@/lib/types';

// Scripted flow used when API keys are missing, so the site is fully
// testable before ANTHROPIC_API_KEY / SERPAPI_KEY are configured.

export function demoChatReply(messages: ChatMessage[]): ChatReply {
  const userTurns = messages.filter((m) => m.role === 'user');
  if (userTurns.length <= 1) {
    return {
      reply: 'What should they deliver, in a sentence?',
      chips: [],
      done: false,
      brief: null,
    };
  }
  if (userTurns.length === 2) {
    return {
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
  return { reply: 'On it. Give me about 20 seconds.', chips: [], done: true, brief };
}

// Same idea for /stuck: a believable two-question intake without API keys.
// Plain language, so a non-technical founder follows along too.
export function demoDevChatReply(messages: ChatMessage[]): ChatReply {
  const userTurns = messages.filter((m) => m.role === 'user');
  if (userTurns.length <= 1) {
    return {
      reply: 'Which tool are you using, and what does it keep doing?',
      chips: ['Claude Code', 'Codex', 'Cursor', 'Windsurf'],
      done: false,
      brief: null,
    };
  }
  if (userTurns.length === 2) {
    return {
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
    reply: 'On it. Finding someone who can jump in now.',
    chips: [],
    done: true,
    brief,
  };
}

export function demoExperts(): Expert[] {
  return [
    {
      id: 'e1',
      name: 'Amira Hassan',
      country: 'Berlin, DE',
      flag: '🇩🇪',
      rating: 4.9,
      reviews: 127,
      price: '€9.5k fixed',
      why: 'Ran the full PSD2 + BaFin application for two Berlin payment startups; the latest got licensed in seven months. Her fixed-scope offer sits inside your budget.',
      source: 'upwork.com',
      photo: '/avatars/a1.jpg',
      top_match: true,
    },
    {
      id: 'e2',
      name: 'Jonas Weber',
      country: 'Munich, DE',
      flag: '🇩🇪',
      rating: 5.0,
      reviews: 84,
      price: '€120/hr',
      why: 'Eight years at BaFin before going independent; now guides founding teams through licensing. The fit if you keep the application in-house and want a supervisor’s eye on it.',
      source: 'fiverr.com',
      photo: '/avatars/a2.jpg',
      top_match: false,
    },
    {
      id: 'e3',
      name: 'Priya Nair',
      country: 'Amsterdam, NL',
      flag: '🇳🇱',
      rating: 4.8,
      reviews: 61,
      price: '€95/hr',
      why: 'Compliance lead for an EMI that cleared BaFin passporting in 2024. Strong on German-language filings; lands slightly over budget unless the scope stays tight.',
      source: 'toptal.com',
      photo: '/avatars/a3.jpg',
      top_match: false,
    },
  ];
}
