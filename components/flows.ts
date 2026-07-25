// Copy and behaviour for the two intake flows. 'main' is the original
// expert search; 'dev' is /stuck, which skips the marketplace search and
// ends on the install-or-email choice instead of expert cards.

export type Flow = 'main' | 'dev';

export interface FlowConfig {
  tag: string | null;
  headline: string;
  sub: string | null;
  // Starter chips. The last one can be a soft opener (see elseChip) that
  // just starts the conversation instead of sending itself as the need.
  suggestions: string[];
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
    sub: 'Tell us what you need. We find the right person and make the intro.',
    // Broad and varied on purpose, so no visitor feels the tool is built
    // for someone else. "Something else" covers the rest.
    suggestions: [
      'AI engineer',
      'Web & app dev',
      'Designer',
      'Video editor',
      'Lawyer',
      'Marketing',
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
    // Sent verbatim as the visitor's opening message, so each one reads like
    // something they would say about their own project. The spread covers
    // improving, fixing, building, automating and speed.
    suggestions: [
      'Improve what I built',
      'Fix what’s broken',
      'Build something new',
      'Automate a manual task',
      'Make it faster',
    ],
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
};
