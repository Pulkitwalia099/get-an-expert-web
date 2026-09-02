import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { avatarPrefix } from '@/lib/operatorOrders';
import { deleteRows, insertRows } from '@/lib/supabase';

// What goes on the customer's page beside a recut: the faces, and the line on
// each thing they asked for.
//
// Separate from /api/operator/orders, which moves a status and emails somebody.
// This writes only what the page renders, so Rohit can put a round together,
// look at it in preview, change his mind and put it together again without a
// single email going out. Sending is still one press of the button over there.
//
// Replace, not append. Both lists are what the page shows right now rather than
// a history of what it once showed, and an operator fixing a typo in one of
// three ticks expects three ticks afterwards, not four.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,32}$/;

/** Caps, matched to what lib/orderAvatars and lib/orderChanges will read back. */
const MAX_AVATARS = 8;
const MAX_CHANGES = 12;
const MAX_TEXT = 300;
const MAX_NAME = 80;

interface AvatarIn {
  slug: string;
  name: string;
  kind: string | null;
  imageUrl: string;
  clipUrl: string | null;
  note: string | null;
  picked: boolean;
}

interface ChangeIn {
  text: string;
  done: boolean;
  note: string | null;
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  return text.length > 0 ? text : null;
}

/**
 * A URL we put there ourselves.
 *
 * The browser hands these back after uploading, so in the ordinary case they
 * are already ours. The check is here because this route takes them on trust
 * otherwise, and a row written now is rendered on a customer's page later: an
 * `<img>` pointed at somebody else's host tells them who opened the order.
 */
function ours(value: unknown, orderId: string): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!url.hostname.endsWith('.public.blob.vercel-storage.com')) return null;
    // Under this order's own prefix, so an operator session cannot hang one
    // customer's faces off another customer's order.
    if (!url.pathname.slice(1).startsWith(avatarPrefix(orderId))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function readAvatars(value: unknown, orderId: string): AvatarIn[] | string {
  if (!Array.isArray(value)) return 'Faces must be a list.';
  const out: AvatarIn[] = [];
  const seen = new Set<string>();

  for (const raw of value.slice(0, MAX_AVATARS)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const row = raw as Record<string, unknown>;

    const slug = str(row.slug, 32)?.toLowerCase() ?? '';
    if (!SLUG.test(slug)) return `"${slug}" is not a usable id for a face.`;
    if (seen.has(slug)) return `Two faces share the id "${slug}".`;
    seen.add(slug);

    const name = str(row.name, MAX_NAME);
    if (!name) return 'Every face needs a name.';

    const imageUrl = ours(row.imageUrl, orderId);
    if (!imageUrl) return `The picture for "${name}" is not on this order.`;

    out.push({
      slug,
      name,
      kind: str(row.kind, MAX_NAME),
      imageUrl,
      clipUrl: ours(row.clipUrl, orderId),
      note: str(row.note, MAX_TEXT),
      picked: row.picked === true,
    });
  }

  // Not enforced as a database constraint, because a lineup mid-edit with none
  // picked is a normal state to save. Enforced here, because more than one
  // badge reading "In your ad" is a page that contradicts itself.
  if (out.filter((a) => a.picked).length > 1) {
    return 'Only one face can be the one in the ad.';
  }
  return out;
}

function readChanges(value: unknown): ChangeIn[] | string {
  if (!Array.isArray(value)) return 'Changes must be a list.';
  const out: ChangeIn[] = [];

  for (const raw of value.slice(0, MAX_CHANGES)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const row = raw as Record<string, unknown>;
    const text = str(row.text, MAX_TEXT);
    // A blank line is a row the operator started and abandoned, so it is
    // dropped rather than refused. Refusing would make clearing one out of
    // three an error message instead of a save.
    if (!text) continue;
    const done = row.done !== false;
    out.push({ text, done, note: done ? null : str(row.note, MAX_TEXT) });
  }
  return out;
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
  if (!UUID.test(orderId)) {
    return NextResponse.json({ error: 'Unknown order' }, { status: 400 });
  }

  // Which cut the ticks belong to. The faces are per order and carry no
  // version, because a brand's lineup does not change because a cut did.
  const version = Number(payload.version);
  if (!Number.isInteger(version) || version < 1 || version > 99) {
    return NextResponse.json({ error: 'Unknown version' }, { status: 400 });
  }

  const results: string[] = [];

  if ('avatars' in payload) {
    const parsed = readAvatars(payload.avatars, orderId);
    if (typeof parsed === 'string') {
      return NextResponse.json({ error: parsed }, { status: 400 });
    }
    // Cleared first so a face removed here is removed there. The window
    // between the two is a page that renders no lineup, which is the failure
    // worth having: the alternative leaves a face nobody meant to publish.
    const cleared = await deleteRows('order_avatars', `order_id=eq.${orderId}`);
    if (!cleared.ok) {
      return NextResponse.json({ error: 'The faces did not save.' }, { status: 502 });
    }
    if (parsed.length > 0) {
      const written = await insertRows(
        'order_avatars',
        parsed.map((a, i) => ({
          order_id: orderId,
          slug: a.slug,
          name: a.name,
          kind: a.kind,
          image_url: a.imageUrl,
          clip_url: a.clipUrl,
          note: a.note,
          picked: a.picked,
          position: i,
        })),
      );
      if (!written.ok) {
        return NextResponse.json({ error: 'The faces did not save.' }, { status: 502 });
      }
    }
    results.push(`${parsed.length} face${parsed.length === 1 ? '' : 's'}`);
  }

  if ('changes' in payload) {
    const parsed = readChanges(payload.changes);
    if (typeof parsed === 'string') {
      return NextResponse.json({ error: parsed }, { status: 400 });
    }
    const cleared = await deleteRows(
      'order_changes',
      `order_id=eq.${orderId}&version=eq.${version}`,
    );
    if (!cleared.ok) {
      return NextResponse.json({ error: 'The list did not save.' }, { status: 502 });
    }
    if (parsed.length > 0) {
      const written = await insertRows(
        'order_changes',
        parsed.map((c, i) => ({
          order_id: orderId,
          version,
          text: c.text,
          done: c.done,
          note: c.note,
          position: i,
        })),
      );
      if (!written.ok) {
        return NextResponse.json({ error: 'The list did not save.' }, { status: 502 });
      }
    }
    results.push(`${parsed.length} change${parsed.length === 1 ? '' : 's'}`);
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    message: `Saved ${results.join(' and ')}. Nobody was emailed.`,
  });
}

export const POST = withMetrics('operator-round', handlePost);
