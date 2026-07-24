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
    tag: 'devs',
    headline: 'Stuck in Claude Code or Codex?',
    sub: 'Two questions, then a human who unsticks AI coding sessions every day.',
    suggestions: [
      'Agent is looping',
      'Broke my repo',
      "MCP won't connect",
      'Burning tokens, no progress',
    ],
    elseChip: null,
    elseOpener: '',
    welcomePlaceholder: "What's it stuck on?",
    searchingStatus: [
      'Finding someone who’s online now…',
      'Checking who’s free…',
    ],
    foundText:
      'Found one. An expert who has fixed this exact kind of thing is online now. Two ways to connect:',
    ending: 'choice',
    teaserIntro:
      'Senior engineer who unsticks agent loops, MCP setups, and runaway sessions every day.',
  },
};
