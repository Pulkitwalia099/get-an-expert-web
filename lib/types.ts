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

export interface Expert {
  id: string;
  name: string;
  country: string;
  flag: string;
  rating: number | null;
  reviews: number | null;
  price: string | null;
  why: string;
  source: string;
  photo: string | null;
  top_match: boolean;
}
