import type { CategoryKey } from '@/components/flows';

// Examples of what people ASK FOR, not a log of finished jobs. Nothing here
// names a customer, an expert, a price or a date, because none of that would
// be true. `ask` is written the way someone types it into the chat; `outcome`
// is the thing they end up holding. Four per category in CATEGORIES, so the
// filter never lands on an empty list.
export interface Example {
  category: CategoryKey;
  ask: string;
  outcome: string;
}

export const EXAMPLES: Example[] = [
  // Design & branding
  {
    category: 'design',
    ask: 'Design a logo and brand kit for my coffee shop',
    outcome: 'Logo files, colours and fonts in one folder.',
  },
  {
    category: 'design',
    ask: 'Make my pitch deck look like a real company built it',
    outcome: 'Investor slides in your own brand, editable.',
  },
  {
    category: 'design',
    ask: 'Redesign the onboarding screens in our app',
    outcome: 'Figma screens a developer can build straight from.',
  },
  {
    category: 'design',
    ask: 'Design packaging for a three product skincare line',
    outcome: 'Print ready artwork with the dielines set up.',
  },

  // Web & apps
  {
    category: 'web',
    ask: 'Build a website for my consulting business',
    outcome: 'A live site you can edit yourself afterwards.',
  },
  {
    category: 'web',
    ask: 'Fix my Shopify checkout, it drops people at payment',
    outcome: 'Checkout working again, tested on card and Apple Pay.',
  },
  {
    category: 'web',
    ask: 'Turn my Figma file into a working front end',
    outcome: 'Coded pages that match the design on phone and desktop.',
  },
  {
    category: 'web',
    ask: 'Build an iPhone app from my idea, enough to show investors',
    outcome: 'A working build you can hand out on TestFlight.',
  },

  // Video & audio
  {
    category: 'video',
    ask: 'Turn 4 hours of footage into a 10 minute video',
    outcome: 'Cut, graded and captioned, ready to post.',
  },
  {
    category: 'video',
    ask: 'Cut my podcast into shorts for TikTok and Reels',
    outcome: 'Ten vertical clips with captions burned in.',
  },
  {
    category: 'video',
    ask: 'Clean up an interview I recorded in a noisy cafe',
    outcome: 'Room noise gone, both voices level across the track.',
  },
  {
    category: 'video',
    ask: 'Make a 30 second ad out of photos of my product',
    outcome: 'One finished ad, exported square, vertical and wide.',
  },

  // AI & automation
  {
    category: 'ai',
    ask: 'Build an AI agent that answers my customer emails',
    outcome: 'An agent drafting replies in your inbox, on your rules.',
  },
  {
    category: 'ai',
    ask: 'Put a chatbot on our site that answers from our help docs',
    outcome: 'A bot answering from your own docs, linking the source.',
  },
  {
    category: 'ai',
    ask: 'Stop my team copying form entries into the CRM by hand',
    outcome: 'An n8n or Zapier flow that runs without anyone watching.',
  },
  {
    category: 'ai',
    ask: 'Pull 5,000 listings into a spreadsheet every week',
    outcome: 'A scraper on a schedule, writing into Google Sheets.',
  },

  // Marketing & growth
  {
    category: 'marketing',
    ask: 'Set up cold outreach that actually gets replies',
    outcome: 'Inboxes warmed, sequences live, replies tracked.',
  },
  {
    category: 'marketing',
    ask: 'Run Meta ads for my gym on 1,000 a month',
    outcome: 'Campaigns live and a weekly cost per lead figure.',
  },
  {
    category: 'marketing',
    ask: 'Get my site ranking for what my customers actually search',
    outcome: 'A keyword plan, plus the on page fixes made for you.',
  },
  {
    category: 'marketing',
    ask: 'Email people who leave something in their cart',
    outcome: 'A three email flow live in Klaviyo, triggered and tested.',
  },

  // Writing & content
  {
    category: 'writing',
    ask: 'Rewrite my homepage so people get what we sell',
    outcome: 'New copy for every section, ready to paste in.',
  },
  {
    category: 'writing',
    ask: 'Write 8 blog posts on things my customers search for',
    outcome: 'Eight edited drafts with titles and meta text.',
  },
  {
    category: 'writing',
    ask: 'Turn our 40 page report into something a customer will read',
    outcome: 'A short version plus a one page summary.',
  },
  {
    category: 'writing',
    ask: 'Write my LinkedIn posts in my voice, twice a week',
    outcome: 'A month of posts, scheduled, still sounding like you.',
  },

  // Data & analytics
  {
    category: 'data',
    ask: 'Build a dashboard so I stop asking people for numbers',
    outcome: 'One dashboard your team opens every morning.',
  },
  {
    category: 'data',
    ask: 'Work out which of my ad channels actually made money',
    outcome: 'Spend against revenue, broken out per channel.',
  },
  {
    category: 'data',
    ask: 'Clean up a customer list full of duplicates and dead emails',
    outcome: 'One deduped list with the bad rows flagged, not deleted.',
  },
  {
    category: 'data',
    ask: 'Label 5,000 images so I can train a model on them',
    outcome: 'A labelled set with a sample checked for accuracy.',
  },

  // Admin & professional
  {
    category: 'admin',
    ask: 'Hand off my inbox and calendar, 10 hours a week',
    outcome: 'An assistant working your hours, in your tools.',
  },
  {
    category: 'admin',
    ask: 'Cover customer messages while I am asleep',
    outcome: 'Overnight replies handled, from answers you approved.',
  },
  {
    category: 'admin',
    ask: 'Read this contract before I sign it on Monday',
    outcome: 'The contract marked up, risky clauses called out.',
  },
  {
    category: 'admin',
    ask: 'Sort out my books before tax season',
    outcome: 'Accounts reconciled and filings ready to submit.',
  },
];
