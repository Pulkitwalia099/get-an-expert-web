import { isSetupSlug } from '@/lib/setups';
import { consultSlots } from '@/lib/slots';

// Validation for the /setups forms, kept separate from lib/validate.ts so
// the chat app's schemas stay untouched.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_CHARS = 120;
const MAX_LINK_CHARS = 300;
const MAX_CONTACT_CHARS = 200;
const MAX_CART_ITEMS = 10;
const MAX_BOOKING_DAYS_AHEAD = 60;

export interface ConsultRequest {
  email: string;
  date: string;
  slot: string;
  setups: string[];
}

export interface ReelRequest {
  link: string;
  contact?: string;
}

const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

// Free consultation booking. Date is a plain YYYY-MM-DD in the visitor's
// selection, allowed from today to 60 days out; slots come from lib/slots.
export function parseConsultRequest(input: unknown, today = new Date()): ConsultRequest | null {
  if (typeof input !== 'object' || input === null) return null;
  const source = input as Record<string, unknown>;

  const email = typeof source.email === 'string' ? source.email.trim() : '';
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_CHARS) return null;

  const date = typeof source.date === 'string' ? source.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const max = new Date(today.getTime() + MAX_BOOKING_DAYS_AHEAD * 86_400_000);
  if (date < dateKey(today) || date > dateKey(max)) return null;

  const slot = typeof source.slot === 'string' ? source.slot : '';
  if (!consultSlots().includes(slot)) return null;

  if (!Array.isArray(source.setups) || source.setups.length > MAX_CART_ITEMS) return null;
  const setups: string[] = [];
  for (const item of source.setups) {
    if (typeof item !== 'string' || !isSetupSlug(item)) return null;
    setups.push(item);
  }

  return { email, date, slot, setups };
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
