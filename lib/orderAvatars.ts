import { selectRows } from '@/lib/supabase';

// The faces generated for one brand, and the one that got the job.
//
// This exists to answer a question a client asks once and remembers: why does
// the person in my ad look like that? Showing the lineup answers it with the
// work rather than with a paragraph, and it is the first piece of the brand
// kit, which is where the avatar, the personality and the design themes end up
// living per brand rather than per order.
//
// One rule holds the whole section up: a row is a face we actually generated
// while making this brand's work. A face invented afterwards to make the
// lineup look considered would turn "here is what we evaluated" into a false
// claim to somebody who is paying us, which is the same line `lib/demo.ts`
// draws around inventing a biography for a real named person.
//
// Server only. It reads with the service key.

if (typeof window !== 'undefined') {
  throw new Error('lib/orderAvatars is server-only and must never reach the client');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Most faces one lineup will render. Past this it stops being a comparison. */
const MAX_AVATARS = 8;
/** Longest note under a face. Cut, not dropped. */
const MAX_NOTE = 400;

export interface Avatar {
  slug: string;
  name: string;
  kind: string | null;
  imageUrl: string;
  clipUrl: string | null;
  /** Our read of why it carries the brand, or why it did not. */
  note: string | null;
  picked: boolean;
}

interface AvatarRow {
  slug: string;
  name: string;
  kind: string | null;
  image_url: string;
  clip_url: string | null;
  note: string | null;
  picked: boolean;
}

const COLUMNS = 'slug,name,kind,image_url,clip_url,note,picked';

function prose(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, MAX_NOTE);
  return text.length > 0 ? text : null;
}

/**
 * Only https, and only our own storage.
 *
 * The same rule `isParkedFinalUrl` applies to a file ffmpeg is about to open,
 * for a smaller reason: these render as `<img>` and `<video>` on a page behind
 * somebody's session, and a row pointing at a third party host would leak that
 * they opened their order to whoever runs it.
 */
function ours(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!url.hostname.endsWith('.public.blob.vercel-storage.com')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * The lineup for one order, in the order it should be read.
 *
 * Empty for every order that has no rows, which is all of them until somebody
 * adds a lineup. The page renders nothing in that case, so this ships dark and
 * turns on per order.
 *
 * A row whose image is missing or points somewhere that is not ours is
 * dropped rather than rendered broken. Dropping it is safe: the lineup is an
 * explanation, and an explanation with one fewer face is still true.
 */
export async function avatarsFor(orderId: string): Promise<Avatar[]> {
  if (!UUID.test(orderId)) return [];

  const rows = await selectRows<AvatarRow>(
    'order_avatars',
    `select=${COLUMNS}&order_id=eq.${orderId}` +
      `&order=position.asc&limit=${MAX_AVATARS}`,
  );
  if (!rows || rows.length === 0) return [];

  const out: Avatar[] = [];
  for (const row of rows) {
    const imageUrl = ours(row.image_url);
    if (!imageUrl) continue;
    if (typeof row.slug !== 'string' || typeof row.name !== 'string') continue;
    out.push({
      slug: row.slug,
      name: row.name,
      kind: prose(row.kind),
      imageUrl,
      clipUrl: ours(row.clip_url),
      note: prose(row.note),
      picked: row.picked === true,
    });
  }
  return out;
}
