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

export interface ChatReply {
  reply: string;
  chips: string[];
  done: boolean;
  brief: Brief | null;
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
