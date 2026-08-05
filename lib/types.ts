export type ApiRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ApiRole;
  content: string;
}

export interface Brief {
  expert_type: string;
  domain: string;
  specifics: string;
  engagement: string;
  budget: string;
  timeline: string;
  search_query: string;
}

export type ChipMode = 'single' | 'multi';
export type PrimaryPath = 'session' | 'email';
export type MatchConfidence = '' | 'medium' | 'high';

export interface ChatReply {
  reply: string;
  chips: string[];
  done: boolean;
  brief: Brief | null;
  /** How the chips on this turn behave. 'main' flow always gets 'single'. */
  chip_mode: ChipMode;
  /** Which ending leads, judged from the work. Unused by the 'main' flow. */
  primary_path: PrimaryPath;
  /** The visitor is a freelancer applying to join, not a client. */
  expert_signup: boolean;
  /** One line on the matched expert. Empty unless done. */
  match_intro: string;
  /** Empty unless done. */
  match_confidence: MatchConfidence;
}

/**
 * One matched person, as the server holds them.
 *
 * Never sent to a browser as-is. `name`, `photo` and `link` are the three
 * fields the gate withholds, so everything that crosses the wire goes through
 * `redactExpert` in lib/experts.ts first.
 */
export interface ExpertRecord {
  /** 1 to 8. Stable within a set, and the id the browser is given. */
  slot: number;
  name: string;
  country: string;
  flag: string;
  rating: number | null;
  reviews: number | null;
  price: string | null;
  /** Only what the search result actually supports. */
  why: string;
  /** The "Why this could fit" block. Our read of the work, not their history. */
  projected: string;
  /** The marketplace or host the profile lives on. Shown to the visitor. */
  source: string;
  /**
   * Which retrieval engine found this person. Telemetry, never rendered.
   *
   * Copied from the raw result, never from the model, and deliberately absent
   * from `Expert`: a browser has no use for it and it is the one field that
   * would let a reader infer how a withheld person was found.
   */
  engine: string;
  /**
   * A GitHub account linked from this result was read and belongs to a person.
   *
   * A boolean and nothing more, deliberately. The figures behind it go into the
   * ranking prompt and stop there: a star count or a handle on a locked card is
   * a search term anybody could paste into GitHub to read off the name the card
   * is withholding.
   */
  code_verified: boolean;
  photo: string | null;
  link: string;
  top_match: boolean;
}

/**
 * One matched person as a browser sees them.
 *
 * `name`, `photo` and `link` are null whenever `locked` is true, and they are
 * null because the server never put them in the response, not because the UI
 * is hiding them. A card renders a redaction bar off `locked`, never off a
 * blurred copy of the real value.
 */
export interface Expert {
  id: string;
  slot: number;
  name: string | null;
  country: string;
  flag: string;
  rating: number | null;
  reviews: number | null;
  price: string | null;
  why: string;
  projected: string;
  source: string;
  /** Safe on a locked card: it says a check happened, never who passed it. */
  code_verified: boolean;
  photo: string | null;
  link: string | null;
  top_match: boolean;
  locked: boolean;
}
