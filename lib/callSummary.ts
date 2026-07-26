import { stripEmDashes } from '@/lib/humanize';
import type { Brief } from '@/lib/types';

// Two lines, because that is what fits in a Telegram notification without
// being expanded. Line one is what they need, line two is what they just
// said, which is usually the detail that decides whether to pick up.

const MAX_LINE = 180;

function clip(text: string, max = MAX_LINE): string {
  const clean = stripEmDashes(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildSummary(brief: Brief | null, lastMessage: string): string {
  const message = clip(lastMessage) || 'No message.';
  if (!brief) return `No brief yet.\n${message}`;
  const need = [brief.expert_type, brief.specifics].filter(Boolean).join(': ');
  return `${clip(need) || 'No brief yet.'}\n${message}`;
}
