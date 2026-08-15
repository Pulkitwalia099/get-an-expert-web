// The links in a brief, turned into things a customer can open.
//
// A brief arrives as one block of text somebody typed, and the links in it are
// the references the work was made against. Printed raw they are addresses; the
// person reviewing a cut wants the thing itself, which is the whole of what
// Pranav asked for on 15 Aug: "I don't remember what I uploaded as a reference."
//
// Client safe. Nothing here fetches anything: the classification is the URL and
// nothing else, so this runs on the server render with no round trip.

export type ReferenceKind =
  | 'instagram-post'
  | 'instagram-profile'
  | 'youtube'
  | 'tiktok'
  | 'vimeo'
  | 'site';

export interface Reference {
  /** The original URL, as typed. Safe to use as an href: http and https only. */
  url: string;
  kind: ReferenceKind;
  /** What it is, for the eyebrow on the card. */
  label: string;
  /** Host and path, for the small monospace line. */
  display: string;
  /**
   * A player URL that renders this reference inline, or null.
   *
   * Only ever built from parts pulled out of the parsed URL with a strict
   * pattern, never by pasting the input into a string. An embed URL is loaded
   * in an iframe on our own page, so an unvalidated one is somebody else's
   * choice of what to run there.
   */
  embed: string | null;
}

/** Most references we will render. A brief past this is a document, not a list. */
const MAX_REFERENCES = 10;

const LABELS: Record<ReferenceKind, string> = {
  'instagram-post': 'Reference video',
  'instagram-profile': 'Instagram profile',
  youtube: 'Reference video',
  tiktok: 'Reference video',
  vimeo: 'Reference video',
  site: 'Link',
};

const SHORTCODE = /^[A-Za-z0-9_-]{5,32}$/;
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;
const DIGITS = /^[0-9]{6,20}$/;
const HANDLE = /^[A-Za-z0-9._]{1,40}$/;

function host(url: URL): string {
  return url.hostname.replace(/^www\./, '').toLowerCase();
}

function classify(url: URL): { kind: ReferenceKind; embed: string | null } {
  const h = host(url);
  const parts = url.pathname.split('/').filter(Boolean);

  if (h === 'instagram.com' || h.endsWith('.instagram.com')) {
    // /p/<code>, /reel/<code> and /tv/<code> are all one post with one embed.
    if ((parts[0] === 'p' || parts[0] === 'reel' || parts[0] === 'tv') && SHORTCODE.test(parts[1] ?? '')) {
      return { kind: 'instagram-post', embed: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed` };
    }
    if (parts.length >= 1 && HANDLE.test(parts[0])) {
      // A profile has no embed worth having. Instagram serves the grid only to
      // a signed in browser, so an iframe here would be a login wall.
      return { kind: 'instagram-profile', embed: null };
    }
    return { kind: 'site', embed: null };
  }

  if (h === 'youtube.com' || h.endsWith('.youtube.com')) {
    const v = url.searchParams.get('v');
    if (v && YT_ID.test(v)) return { kind: 'youtube', embed: `https://www.youtube.com/embed/${v}` };
    if (parts[0] === 'shorts' && YT_ID.test(parts[1] ?? '')) {
      return { kind: 'youtube', embed: `https://www.youtube.com/embed/${parts[1]}` };
    }
    return { kind: 'site', embed: null };
  }
  if (h === 'youtu.be' && YT_ID.test(parts[0] ?? '')) {
    return { kind: 'youtube', embed: `https://www.youtube.com/embed/${parts[0]}` };
  }

  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) {
    const i = parts.indexOf('video');
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && DIGITS.test(id)) return { kind: 'tiktok', embed: `https://www.tiktok.com/embed/v2/${id}` };
    return { kind: 'site', embed: null };
  }

  if (h === 'vimeo.com' && DIGITS.test(parts[0] ?? '')) {
    return { kind: 'vimeo', embed: `https://player.vimeo.com/video/${parts[0]}` };
  }

  return { kind: 'site', embed: null };
}

/** Host and a short path, so a card reads as a place rather than a query string. */
function displayOf(url: URL): string {
  const path = url.pathname.replace(/\/+$/, '');
  const short = path.length > 42 ? `${path.slice(0, 41)}…` : path;
  return `${host(url)}${short}`;
}

/**
 * Every link in a brief, in the order it was written.
 *
 * Only `http:` and `https:` survive. `javascript:` and `data:` are the reason
 * this is a parse rather than a linkify: a brief is text somebody else typed,
 * and it is rendered on a page behind their session. Anything that is not one
 * of the two safe schemes stays plain text, which is exactly what it does today.
 */
export function parseReferences(brief: string | null | undefined): Reference[] {
  if (typeof brief !== 'string' || brief.length === 0) return [];

  const found = brief.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const seen = new Set<string>();
  const out: Reference[] = [];

  for (const candidate of found) {
    // Trailing punctuation belongs to the sentence, not the address. A brief
    // reading "see https://example.com/a." must not link to a 404 ending in a
    // full stop. Closing brackets go too, unless the URL opened one itself.
    const trimmed = candidate.replace(/[.,;:!?)|\]}'"]+$/, '');
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;

    const key = `${host(url)}${url.pathname.replace(/\/+$/, '')}${url.search}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const { kind, embed } = classify(url);
    out.push({ url: url.toString(), kind, label: LABELS[kind], display: displayOf(url), embed });
    if (out.length >= MAX_REFERENCES) break;
  }

  return out;
}

/**
 * The brief with its links taken out, so the two are not printed twice.
 *
 * The prose around them is kept, because a line reading "Reference video:" is
 * the customer labelling their own link and is worth more than our guess at
 * what the link is. Empty when the brief was nothing but addresses.
 */
export function briefProse(brief: string | null | undefined): string {
  if (typeof brief !== 'string') return '';
  return brief
    .replace(/https?:\/\/[^\s<>"'`]+/gi, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').replace(/^[\s|,;:-]+|[\s|,;:-]+$/g, '').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
