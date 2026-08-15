import { scrubUntrusted } from '@/lib/sanitize';

// The name somebody types into their own settings, cleaned once.
//
// Split out of lib/accounts.ts for the same reason lib/credit-math.ts is split
// out of lib/credits.ts: that module is server-only and throws on sight of a
// browser, and the settings form is a client component that needs the length
// cap. One definition, so the field and the API cannot disagree about what
// fits.
//
// Deliberately not the judgement in lib/initials.ts. `firstName` refuses
// anything doubtful because it is guessing at a free text field on a public
// form, and it is right to. This is a person typing their own name into their
// own account, and refusing to store "Mo" because it is two characters would
// be the settings page arguing with them. `firstName` still decides at
// greeting time whether the stored value is usable, which is where that
// judgement belongs.

export const MAX_NAME = 80;

/**
 * What to store, or null to clear it.
 *
 * Null rather than an empty string. The column is nullable, `accountName` in
 * lib/orderMail.ts falls back to "Hi," when it reads null, and a blank string
 * stored instead is a value that looks like a name and greets nobody.
 *
 * Scrubbed with the same function used on text from the open web, because a
 * name is printed into an email and into a page: a zero width joiner or a bidi
 * override in it is invisible in the field and not invisible anywhere else.
 */
export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Newlines survive scrubUntrusted, which is correct for a brief and wrong
  // for a name, so all whitespace runs collapse to one space here.
  const cleaned = scrubUntrusted(raw).replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  // Trimmed again: the cut can land mid space and leave a trailing one.
  return cleaned.slice(0, MAX_NAME).trim();
}
