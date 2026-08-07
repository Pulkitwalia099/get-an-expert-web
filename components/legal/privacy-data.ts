// The factual spine of the privacy policy, kept out of the page so the prose
// and the facts can be checked separately. Every entry here was read off the
// code rather than assumed: migrations in supabase/migrations for the tables,
// lib/analytics.ts and lib/replay.ts for the recording config, lib/serp.ts and
// lib/anthropic.ts for what leaves the server, and purge_expired() in the
// second migration for the retention periods.
//
// If a table, a subprocessor or a retention window changes, change it here and
// the page follows. A privacy policy that drifts from the code is worse than
// none, because it is a written representation that is no longer true.

export interface Collected {
  what: string;
  detail: string;
}

export const COLLECTED: Collected[] = [
  {
    what: 'What you type into the chat',
    detail:
      'Every message you send and every reply we send back, along with which question it answered. This is how the service works: the assistant reads what you need in order to brief an expert.',
  },
  {
    what: 'Your brief',
    detail:
      'The structured summary the assistant builds from your conversation: the kind of expert you need, the field, and the specifics you gave.',
  },
  {
    what: 'Your email address and name',
    detail:
      'Only when you give them to us to request an introduction, a call back, a booking, a demo, or when you send us a message. We do not ask for them to browse the site.',
  },
  {
    what: 'What you send us through a form',
    detail:
      'The message and subject you type into the contact form. If you register as an expert or list your agents, also what you say you do, what you want to charge, and when you are free to meet. Stored with your email in the same table as every other enquiry, so a deletion request removes it with everything else.',
  },
  {
    what: 'Session and device information',
    detail:
      'An anonymous session identifier, your browser user agent, the page that referred you, and the times you arrived and last interacted.',
  },
  {
    what: 'Your IP address',
    detail:
      'Used to count requests per minute so that one visitor cannot exhaust the service for everyone else. It is used for rate limiting and abuse prevention, and is not used to build a profile of you.',
  },
  {
    what: 'Search activity',
    detail:
      'The query we ran to find candidate experts, how many results came back, how long it took, and whether we fell back to sample data.',
  },
  {
    what: 'Call records',
    detail:
      'If you ask to speak to a human: the time, the status of the call, who took it, and a short written summary. Calls carry audio only and are not recorded.',
  },
  {
    what: 'Bookings',
    detail:
      'If you book a session, the booking details and the brief summary passed to the calendar so the expert knows what you need.',
  },
];

export interface Processor {
  name: string;
  purpose: string;
  gets: string;
}

// Ordered by how much they receive, most first. "Gets" is deliberately specific
// rather than "your data", because the whole point of naming a subprocessor is
// to tell someone what actually leaves.
export const PROCESSORS: Processor[] = [
  {
    name: 'Anthropic',
    purpose: 'Runs the assistant that asks the intake questions and ranks candidate experts.',
    gets: 'Your chat messages and your brief. Not your email address or your name.',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics and session replay.',
    gets:
      'Pageviews, interaction events, device and browser information, and a replay of your visit that includes the conversation. Email and name fields are blocked at the moment of recording and never reach it.',
  },
  {
    name: 'Supabase',
    purpose: 'The database everything above is stored in.',
    gets: 'Everything listed under what we collect.',
  },
  {
    name: 'Vercel',
    purpose: 'Hosts and serves the site.',
    gets: 'Standard request logs, including IP address.',
  },
  {
    name: 'SerpAPI',
    purpose: 'Searches public web profiles for candidate experts.',
    gets:
      'A short search phrase built from the kind of work you need. The specifics you typed are deliberately never included in it.',
  },
  {
    name: 'Resend',
    purpose: 'Delivers email.',
    gets: 'Your email address and the contents of the message we send you.',
  },
  {
    name: 'Cal.com',
    purpose: 'Handles scheduling when you book a session.',
    gets: 'Your name, email address and a summary of your brief, as the booking notes.',
  },
  {
    name: 'Daily',
    purpose: 'Carries the audio when you ask to talk to a human.',
    gets: 'Live audio for the duration of the call. Nothing is recorded or stored.',
  },
  {
    name: 'Telegram',
    purpose: 'Alerts the on-call person that someone is asking to talk.',
    gets: 'A notification containing your first name and a one line summary of what you need.',
  },
];

export interface Retention {
  what: string;
  period: string;
}

// Straight from purge_expired(), which the daily report route calls.
export const RETENTION: Retention[] = [
  { what: 'Email addresses and everything attached to a request', period: '12 months' },
  { what: 'Sessions, messages and searches', period: '12 months from your last activity' },
  { what: 'Internal API event records', period: '3 months' },
  { what: 'Rate limiting counters', period: '2 months' },
];
