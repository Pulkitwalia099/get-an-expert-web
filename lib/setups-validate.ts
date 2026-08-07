
// Validation for the /setups forms, kept separate from lib/validate.ts so
// the chat app's schemas stay untouched.

const MAX_LINK_CHARS = 300;
const MAX_CONTACT_CHARS = 200;

export interface ReelRequest {
  link: string;
  contact?: string;
}

// "Seen a setup we're missing?" submissions: a link plus optional contact.
export function parseReelRequest(input: unknown): ReelRequest | null {
  if (typeof input !== 'object' || input === null) return null;
  const source = input as Record<string, unknown>;

  const link = typeof source.link === 'string' ? source.link.trim() : '';
  if (link.length === 0 || link.length > MAX_LINK_CHARS) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  const contact =
    typeof source.contact === 'string' && source.contact.trim().length > 0
      ? source.contact.trim().slice(0, MAX_CONTACT_CHARS)
      : undefined;

  return contact ? { link, contact } : { link };
}
