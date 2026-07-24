// The steps a visit moves through, and what the composer invites in each one.
// Lives apart from Chat so the search half can move the phase without the two
// files importing each other.

export type Phase =
  | 'welcome'
  | 'chat'
  | 'searching'
  | 'matches'
  | 'refine'
  | 'email'
  | 'choice'
  | 'done';

// Once the welcome chips are gone the placeholder is the only prompt a visitor
// gets, so every phase says what it wants here.
export const PLACEHOLDERS: Record<Phase, string> = {
  welcome: "I'm looking for…",
  chat: 'Reply…',
  searching: 'One moment…',
  matches: 'Not right? Tell me…',
  refine: 'Describe who you need…',
  email: 'you@company.com',
  choice: 'Questions? Ask here…',
  done: 'Anything else?',
};
