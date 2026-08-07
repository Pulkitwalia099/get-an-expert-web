import type { CategoryKey } from '@/components/flows';

// Examples of what people ASK FOR, not a log of finished jobs. Nothing here
// names a customer, an expert, a price or a date, because none of that would
// be true. `ask` is written the way someone types it into the chat; `outcome`
// is the thing they end up holding. Four per category in CATEGORIES, so the
// filter never lands on an empty list.
//
// Rewritten in full on 2026-08-04. The old list was ordered design, web,
// video, ai, marketing, and read as a freelance board: a logo for a coffee
// shop, a Shopify checkout, eight blog posts, books before tax season. The
// setups grid one screen above it sells 3D sites, cloned voices and OpenClaw,
// so a visitor met two different companies in one scroll and the second one
// took back what the first had promised.
//
// The rule for what belongs here now: if someone could get a good version of
// it out of Claude Code in an afternoon, it does not earn a slot. Design and
// web survive by pointing at the part the model does not finish.
//
// Blocks are in CATEGORIES order, so reading this file top to bottom is the
// same as reading the filter row left to right.
export interface Example {
  category: CategoryKey;
  ask: string;
  outcome: string;
}

export const EXAMPLES: Example[] = [
  // Growth & GTM
  // Absorbs the old writing category. Every line is a motion with public
  // evidence behind it: Reddit carries roughly 40% of what ChatGPT cites,
  // most small businesses still miss inbound calls, and buyers now research
  // through a model before they ever reach a search box.
  {
    category: 'marketing',
    ask: 'Set up cold outreach that actually gets replies',
    outcome: 'Inboxes warmed, sequences live, replies tracked.',
  },
  {
    category: 'marketing',
    ask: 'Get us into the Reddit threads our buyers actually read',
    outcome: 'Threads you own in the subreddits that decide your category.',
  },
  {
    category: 'marketing',
    ask: 'Put a voice agent on our phone line that books the job',
    outcome: 'A number that picks up at any hour, qualifies, and fills the calendar.',
  },
  {
    category: 'marketing',
    ask: 'Make ChatGPT recommend us when someone asks for our category',
    outcome: 'Cited by the answer engines, with a weekly record of where.',
  },

  // AI & automation
  {
    category: 'ai',
    ask: 'Wire our own tools into Claude so the team can just ask',
    outcome: 'An MCP server your systems talk through, with access you control.',
  },
  {
    category: 'ai',
    ask: 'Give the company one brain that knows our docs, Slack and drive',
    outcome: 'One place to ask, answering with the source attached.',
  },
  {
    category: 'ai',
    ask: 'Put an agent in my inbox that drafts replies the way I write',
    outcome: 'Drafts waiting each morning, on rules you approved.',
  },
  {
    category: 'ai',
    ask: 'Run tier one support without a human reading every ticket',
    outcome: 'The common questions closed, the rest escalated with context.',
  },

  // Video & motion
  // Was "Video & audio". Cleaning up a noisy interview recording was the
  // weakest line on the page and nobody comes looking for it.
  {
    category: 'video',
    ask: 'Make a digital clone of me I can shoot videos with for years',
    outcome: 'Your face and voice on demand, from a script.',
  },
  {
    category: 'video',
    ask: 'Build a site with real 3D and motion, not a template',
    outcome: 'A site that moves, still fast on a phone.',
  },
  {
    category: 'video',
    ask: 'Turn one long video into a month of clips people finish',
    outcome: 'Thirty vertical cuts, hooks written, captions burned in.',
  },
  {
    category: 'video',
    ask: 'Make a month of UGC ads without hiring a single creator',
    outcome: 'Ten scripted, voiced variants, ready to test.',
  },

  // Security
  // New category. It exists because everyone is now shipping code they did
  // not write and cannot fully read.
  {
    category: 'security',
    ask: 'Find what my vibe coded app is exposing',
    outcome: 'Every key, open endpoint and public bucket found and shut.',
  },
  {
    category: 'security',
    ask: 'Check my AI agent cannot leak customer data before we launch',
    outcome: 'What it can reach, written down, and the holes closed.',
  },
  {
    category: 'security',
    ask: 'Break into our app before an enterprise buyer asks us to',
    outcome: 'Findings ranked by what an attacker gets, with the fixes made.',
  },
  {
    category: 'security',
    ask: 'Get us SOC 2 ready without stopping the roadmap',
    outcome: 'Controls in place and evidence collecting on its own.',
  },

  // Data & intelligence
  {
    category: 'data',
    ask: 'Let me ask our numbers a question in Slack and get an answer',
    outcome: 'Plain English in, the query run for you, chart out.',
  },
  {
    category: 'data',
    ask: 'Work out which channel made money, not which got clicks',
    outcome: 'Spend against revenue, broken out per channel.',
  },
  {
    category: 'data',
    ask: 'Turn five years of messy records into something a model can train on',
    outcome: 'A clean labelled set, with a sample checked by hand.',
  },
  {
    category: 'data',
    ask: 'Tell me when a competitor changes price, hires, or ships',
    outcome: 'A weekly brief, sourced and linked.',
  },

  // Web & apps
  // Demoted from first to sixth, and repointed at the job the model leaves
  // behind rather than the one it now does well.
  {
    category: 'web',
    ask: 'Finish the app my AI got most of the way',
    outcome: 'The last stretch done, tested, and live.',
  },
  {
    category: 'web',
    ask: 'Take my prototype to something real users will not break',
    outcome: 'Auth, payments and a database that holds up.',
  },
  {
    category: 'web',
    ask: 'Build the integration my customers keep asking for',
    outcome: 'A live API connection, documented, with errors handled.',
  },
  {
    category: 'web',
    ask: 'Rebuild our checkout so it stops losing people at payment',
    outcome: 'Tested on card, Apple Pay and a bad connection.',
  },

  // Design & brand
  {
    category: 'design',
    ask: 'Make my product look like a real company built it',
    outcome: 'A design system a developer can build straight from.',
  },
  {
    category: 'design',
    ask: 'Brand an AI product so it does not look like every other one',
    outcome: 'Name, marks, colour and type, in one folder.',
  },
  {
    category: 'design',
    ask: 'Redesign onboarding so people reach the thing they came for',
    outcome: 'Flows tested on real users, with the drop off marked.',
  },
  {
    category: 'design',
    ask: 'Turn our deck into something an investor reads to the end',
    outcome: 'Investor slides in your own brand, editable.',
  },

  // Admin & professional
  // Deliberately unchanged in spirit. A contract review is not a frontier ask
  // and dressing one up as if it were would read as a stretch.
  {
    category: 'admin',
    ask: 'Read this contract before I sign it Monday',
    outcome: 'Marked up, with the risky clauses called out.',
  },
  {
    category: 'admin',
    ask: 'Hand off my inbox and calendar, ten hours a week',
    outcome: 'An assistant working your hours, in your tools.',
  },
  {
    category: 'admin',
    ask: 'Set us up to hire someone in another country',
    outcome: 'Entity, contracts and payroll, ready to run.',
  },
  {
    category: 'admin',
    ask: 'Sort out my books before tax season',
    outcome: 'Accounts reconciled and filings ready to submit.',
  },
];
