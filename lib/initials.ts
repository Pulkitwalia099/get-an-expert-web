export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Placeholders people actually type into a name field, plus the ones our own
// test rows carry. Greeting somebody as "Hi Test," is worse than not greeting
// them at all, and these are the strings that produce it.
const NOT_A_NAME = new Set([
  'test',
  'testing',
  'asdf',
  'abc',
  'na',
  'n/a',
  'none',
  'null',
  'undefined',
  'anonymous',
  'user',
  'customer',
  'admin',
  'me',
  'x',
]);

/**
 * A first name worth putting in a greeting, or null.
 *
 * Null is a perfectly good answer and the caller falls back to "Hi,". This
 * field is free text on a public form: it holds company names, email
 * addresses, full sentences, "TEST SUBMISSION (ignore)" and, often, nothing.
 * A greeting is worth having when it is right and actively bad when it is
 * wrong, so anything doubtful is refused rather than guessed at.
 *
 * Only the case of an all lowercase name is touched. "pulkit" becomes "Pulkit"
 * because nobody writes their own name that way on purpose, while "McDonald",
 * "de Souza" and "JP" are left exactly as they were typed. Capitalising a name
 * somebody deliberately styled is its own small insult.
 */
export function firstName(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  // An address in the name field is common and reads terribly in a greeting.
  if (!trimmed || trimmed.includes('@')) return null;
  // Digits and brackets anywhere in the field mean a handle, a company, or one
  // of our own test rows. Judged on the whole string rather than on the first
  // word, because "GO LIVE TEST (delete me)" begins with two innocent letters
  // and the tell is further along.
  if (/[\d()[\]{}<>/\\|_]/.test(trimmed)) return null;

  const words = trimmed.split(/[\s,]+/).filter(Boolean);
  // A placeholder anywhere disqualifies the lot, for the same reason.
  if (words.some((w) => NOT_A_NAME.has(w.replace(/[.,;:!?"'`]+$/, '').toLowerCase()))) return null;

  const first = words[0]?.replace(/[.,;:!?"'`]+$/, '') ?? '';
  if (first.length < 2 || first.length > 20) return null;
  // At least one letter, in any alphabet, so a name in Devanagari or Chinese
  // is as welcome as one in Latin script.
  if (!/\p{L}/u.test(first)) return null;

  // Forms are filled in shouting more often than anybody would like, and "Hi
  // JOHN," is not a greeting. Two letters are left alone, because that is far
  // more likely to be initials somebody uses as their name than a shout.
  if (first.length > 2 && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return first[0] + first.slice(1).toLowerCase();
  }
  return first === first.toLowerCase() ? first[0].toUpperCase() + first.slice(1) : first;
}

/** "Hi Pulkit," or "Hi," when there is no name worth using. */
export function greeting(raw: string | null | undefined): string {
  const name = firstName(raw);
  return name ? `Hi ${name},` : 'Hi,';
}
