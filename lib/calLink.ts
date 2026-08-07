import { buildSummary } from '@/lib/callSummary';
import { OPERATORS, type OperatorId } from '@/lib/operators';
import { stripEmDashes } from '@/lib/humanize';
import type { Brief } from '@/lib/types';

// Everything the Cal.com inline embed needs. Kept pure and separate from
// the component so the prefill can be tested without a browser.

export interface CalPrefill {
  calLink: string;
  name: string | null;
  email: string | null;
  notes: string;
}

export function buildCalPrefill(
  id: OperatorId,
  brief: Brief | null,
  lastMessage: string,
  contact: { name?: string | null; email?: string | null },
): CalPrefill {
  return {
    calLink: OPERATORS[id].calLink,
    name: contact.name ? stripEmDashes(contact.name) : null,
    email: contact.email ?? null,
    notes: buildSummary(brief, lastMessage),
  };
}
