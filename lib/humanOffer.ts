// When the agent should offer a human.
//
// Two triggers, both deliberate. Engagement: by the third message someone is
// invested enough that the offer reads as help rather than a pitch. Distress:
// certain phrasings mean the conversation has already failed them, and
// waiting two more turns to say so wastes the moment.
//
// Pure and keyword based on purpose. This runs in the browser on every turn,
// so it cannot cost a model call or a round trip.

const STUCK_SIGNALS = [
  'stuck',
  'not working',
  'still broken',
  'doesnt work',
  "doesn't work",
  'does not work',
  'no luck',
  'tried everything',
  'giving up',
  'give up',
  'frustrat',
  'urgent',
  'asap',
  'right now',
  'losing money',
  'production is down',
  'nothing works',
];

// Third user message. One is a headline, two is a clarification, three means
// they are working the problem with us.
export const OFFER_AFTER_TURNS = 3;

export function soundsStuck(text: string): boolean {
  const t = text.toLowerCase();
  return STUCK_SIGNALS.some((signal) => t.includes(signal));
}

/**
 * userTurns counts messages the visitor has sent, including the one in
 * `text`. Offered at most once a visit: a second offer reads as nagging.
 */
export function shouldOfferHuman({
  text,
  userTurns,
  alreadyOffered,
}: {
  text: string;
  userTurns: number;
  alreadyOffered: boolean;
}): boolean {
  if (alreadyOffered) return false;
  if (soundsStuck(text)) return true;
  return userTurns >= OFFER_AFTER_TURNS;
}
