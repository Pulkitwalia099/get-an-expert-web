import type { ChatMessage } from '@/lib/types';

// How many turns of the conversation travel with each request. Older turns
// fall off the front.
export const MAX_API_MESSAGES = 28;

// Trim the history the client sends, keeping the newest turns.
//
// The trim can only ever start on a user turn. The interface sometimes speaks
// for the model (the "something else" opener, the refine question), so a plain
// slice can leave the array opening on an assistant turn, which parseMessages
// rejects outright and the visitor sees as "Hit a snag." Dropping the orphaned
// assistant turns is the only fix: the API will not take a history that starts
// with the assistant either.
export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const kept = messages.slice(-MAX_API_MESSAGES);
  const firstUser = kept.findIndex((m) => m.role === 'user');
  return firstUser > 0 ? kept.slice(firstUser) : kept;
}
