// Copy and behaviour for the two intake flows. 'main' is the original
// expert search; 'dev' is /stuck, which skips the marketplace search and
// ends on the install-or-email choice instead of expert cards.

export type Flow = 'main' | 'dev' | 'ask';

// The eight things we match people to. Used by the starter chips and by the
// examples list below the window, so a chip and an example agree on wording.
//
// 'writing' is gone and 'security' took its slot. Posts, homepage copy and
// blog drafts are go to market work that happened to be filed on their own,
// and folding them into marketing frees the eighth slot without making the
// filter row any longer than it already is on a phone.
//
// The keys are deliberately not renamed to match the new labels. 'marketing'
// reads Growth & GTM and 'data' reads Data & intelligence, because a key is
// referenced by every example, every chip and a colour token, and renaming one
// to match a label buys nothing a reader ever sees.
export type CategoryKey =
  | 'design'
  | 'web'
  | 'video'
  | 'ai'
  | 'marketing'
  | 'security'
  | 'data'
  | 'admin';

// Order is the argument. This list used to open on design and web, which are
// the two things a visitor can now do themselves with Claude Code, and buried
// growth at five and AI at four. Leading on the work that still needs a person
// is the whole point of the reorder.
export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'marketing', label: 'Growth & GTM' },
  { key: 'ai', label: 'AI & automation' },
  { key: 'video', label: 'Video & motion' },
  { key: 'security', label: 'Security' },
  { key: 'data', label: 'Data & intelligence' },
  { key: 'web', label: 'Web & apps' },
  { key: 'design', label: 'Design & brand' },
  { key: 'admin', label: 'Admin & professional' },
];

// A starter chip carries two lengths of the same idea. `label` has to survive
// a 390px marquee, so it stays short; `message` is what actually gets sent as
// the visitor's opening line, so it has to read like something a person typed.
// Sending the label would give the model two or three words to work with.
export interface Suggestion {
  label: string;
  message: string;
  category: CategoryKey;
}

export interface FlowConfig {
  tag: string | null;
  headline: string;
  sub: string | null;
  // Starter chips. The catch-all lives in elseChip, not here, because it
  // opens the conversation instead of sending itself as the need.
  suggestions: Suggestion[];
  // Cycled through the empty composer, typed rather than swapped. The longest
  // and most specific asks go here: this is the only place the page shows how
  // much detail is welcome. Keep every line true to what we actually match.
  placeholders: string[];
  elseChip: string | null;
  elseOpener: string;
  welcomePlaceholder: string;
  searchingStatus: string[];
  foundText: string;
  ending: 'cards' | 'choice';
  // One-line, non-identifying intro shown (unblurred) on the dev teaser.
  // The name and face stay hidden until the visitor connects.
  teaserIntro: string | null;
}

// One MCP install target per coding tool. Claude Code and Codex take a
// one-line CLI command; Cursor is configured with a JSON snippet.
export interface InstallTarget {
  key: string;
  label: string;
  kind: 'command' | 'json';
  code: string;
  note: string;
}

const AGENT = 'get-an-expert-agent@latest';

export const INSTALL_TARGETS: InstallTarget[] = [
  {
    key: 'claude',
    label: 'Claude Code',
    kind: 'command',
    code: `claude mcp add get-an-expert --scope user -- npx -y ${AGENT}`,
    note: 'Run it in your project, then ask Claude to "get an expert".',
  },
  {
    key: 'codex',
    label: 'Codex',
    kind: 'command',
    code: `codex mcp add get-an-expert -- npx -y ${AGENT}`,
    note: 'Run it, then ask Codex to "get an expert".',
  },
  {
    key: 'cursor',
    label: 'Cursor',
    kind: 'json',
    code: `{
  "mcpServers": {
    "get-an-expert": {
      "command": "npx",
      "args": ["-y", "${AGENT}"]
    }
  }
}`,
    note: 'Add to ~/.cursor/mcp.json, then enable it in Settings, Tools and MCP.',
  },
];

export const FLOWS: Record<Flow, FlowConfig> = {
  main: {
    tag: null,
    headline: 'What kind of expert are you looking for?',
    sub: 'Tell us what you need. We find the right expert and make the intro.',
    // Broad and varied on purpose, so no visitor feels the tool is built
    // for someone else. "Something else" covers the rest.
    suggestions: [
      { label: 'Designer', message: 'I need a designer', category: 'design' },
      { label: 'Web & app dev', message: 'I need a web or app developer', category: 'web' },
      { label: 'Video editor', message: 'I need a video editor', category: 'video' },
      { label: 'AI engineer', message: 'I need an AI engineer', category: 'ai' },
      { label: 'Marketing', message: 'I need a marketer', category: 'marketing' },
      { label: 'Lawyer', message: 'I need a lawyer', category: 'admin' },
    ],
    placeholders: [
      'I need a designer for a logo and brand kit',
      'I need a developer to build my website',
      'I need an editor for my YouTube videos',
      'I need someone to build an AI agent',
      'I need help with cold outreach',
    ],
    elseChip: 'Something else',
    elseOpener: 'Tell me what you need, in a sentence.',
    welcomePlaceholder: "I'm looking for…",
    searchingStatus: ['Scanning profiles…', 'Checking availability…', 'Ranking matches…'],
    foundText:
      'These are the top matches. Who would you like an intro to? You can pick more than one.',
    ending: 'cards',
    teaserIntro: null,
  },
  dev: {
    // No tag. This stopped being the page for one audience when it became the
    // front door; a "devs" badge over a general intake reads as the wrong room.
    tag: null,
    headline: 'What are you working on?',
    // The sub-line has to answer "what is this" for someone who arrived from an
    // ad on a phone and has never heard of midsesh. The previous line stopped at
    // being matched, which is a middle step: it described what we do rather than
    // what the visitor ends up with. The expert is the subject here, and "takes
    // it off your plate" is the ending the old line was missing.
    sub: 'Talk it through, then an expert who has done it many times before takes it off your plate.',
    // The old set was five verbs about code you had already written, which
    // asked every visitor to have started before they arrived. Someone after a
    // logo or a website read five doors and none said their name. These are
    // outcomes instead, and they spread across every category we match, so the
    // page stops looking like it was built for one kind of person.
    // The copy the root page has always shipped. Kept byte for byte in meaning
    // when the Suggestion shape changed: label and message are the same string
    // here, because these were written to be sent verbatim.
    suggestions: [
      { label: 'Improve what I built', message: 'Improve what I built', category: 'web' },
      { label: 'Fix what’s broken', message: 'Fix what’s broken', category: 'web' },
      { label: 'Build something new', message: 'Build something new', category: 'web' },
      { label: 'Automate a manual task', message: 'Automate a manual task', category: 'ai' },
      { label: 'Make it faster', message: 'Make it faster', category: 'web' },
    ],
    placeholders: ['I’m working on…'],
    elseChip: 'Something else',
    elseOpener: 'Tell me what you need, in a sentence.',
    welcomePlaceholder: 'I’m working on…',
    searchingStatus: [
      'Looking for the right person…',
      'Checking who has done this…',
    ],
    foundText: 'Found one. Two ways to connect:',
    ending: 'choice',
    // Fallback only. The model writes a per-visitor line when it has one, so
    // this has to stay true for any need and never mention code.
    teaserIntro: 'An expert who has done this kind of work before.',
  },

  // /ask. Same machinery as dev, different front door: the hero owns the
  // headline and the chips, so this copy is written for a search bar rather
  // than a chat window.
  ask: {
    tag: null,
    headline: 'What do you want done?',
    // The offer leads. "Free first session" was the actual promise for months
    // and appeared on no surface, while the line spent its length on "has done
    // it many times before", which is a vetting claim the hero cannot back up.
    // That claim moved down to Trust, which says how the vetting works, so the
    // hero is shorter now and says the thing that gets someone to type.
    //
    // "Call", not "session". Session was doing three jobs on one page: the free
    // thing here, a paid 60 or 90 minute setup in the grid below, and the
    // coding session an expert joins at the end of the chat. A visitor read
    // "first session is free" next to eleven $11 setups and could not tell
    // which was true. The free thing is a 15 minute call, so it says call.
    sub: 'Your first call is free. Talk it through, then an expert takes it off your plate.',
    // Ordered by where the demand actually is, not by what reads nicest. The
    // setups people already buy are automation and growth first, so those lead
    // and design sits further down. Label has to survive a 390px row; message
    // is what actually gets sent, so it has to read like a person typed it.
    suggestions: [
      { label: 'Automations', message: 'Automate a task I do by hand every week', category: 'ai' },
      { label: 'AI agent', message: 'Build an AI agent for my business', category: 'ai' },
      { label: 'Cold outreach', message: 'Set up cold outreach that gets replies', category: 'marketing' },
      { label: 'Content', message: 'Get my content written and posted every week', category: 'marketing' },
      { label: 'Website', message: 'Make a professional website for my business', category: 'web' },
      { label: 'Video edit', message: 'Turn my raw footage into a finished video', category: 'video' },
      { label: 'Fix a bug', message: 'Fix something in my app that keeps breaking', category: 'web' },
      { label: 'Mobile app', message: 'Build a mobile app from my idea', category: 'web' },
      { label: 'Logo & brand', message: 'Get a logo and brand kit designed', category: 'design' },
    ],
    // Longer and more specific than the chips on purpose. The chips say what is
    // on offer; these say how much detail is welcome.
    placeholders: [
      'Automate the report I build by hand every Monday',
      'Build an AI agent that answers customer emails',
      'Post my content everywhere without writing it twice',
      'Turn 4 hours of footage into a 10 minute video',
      'Make a professional website for my business',
    ],
    elseChip: 'Something else',
    elseOpener: 'Tell me what you need, in a sentence.',
    welcomePlaceholder: 'I need…',
    searchingStatus: ['Looking for the right person…', 'Checking who has done this…'],
    foundText: 'Found one. Two ways to connect:',
    ending: 'choice',
    teaserIntro: 'An expert who has done this kind of work before.',
  },
};
