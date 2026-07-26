import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { MATCH_ORDER, matchOperator, OPERATORS, tagFor } from '@/lib/operators';
import { readPresence } from '@/lib/presence';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { coerceBrief } from '@/lib/validate';

const MAX_MESSAGE_CHARS = 600;
const MAX_CONVERSATION_CHARS = 4_000;
const RATE_LIMIT = 30;

// Asked once, when the visitor taps the pill. Nothing is polled, so the
// chat never advertises an empty room.
//
// The reply is built field by field rather than by spreading the operator
// record. That record also holds the Telegram env var name and the Cal.com
// link, and a spread would put both on the public wire the first time
// someone adds a field to the roster.
async function handlePresence(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(clientId(req), RATE_LIMIT)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // coerceBrief always returns a Brief, with empty strings for anything the
  // intake has not filled in yet, so the empties are filtered back out here.
  const brief = coerceBrief(body.brief);
  const lastMessage =
    typeof body.lastMessage === 'string' ? body.lastMessage.slice(0, MAX_MESSAGE_CHARS) : '';
  // Everything they have said, not only the newest line. Matching on the
  // last message alone loses the words that identify the work, which are
  // usually in the opening turn.
  const conversation =
    typeof body.conversation === 'string'
      ? body.conversation.slice(0, MAX_CONVERSATION_CHARS)
      : '';
  const haystack = [
    brief.expert_type,
    brief.domain,
    brief.specifics,
    brief.search_query,
    conversation || lastMessage,
  ]
    .filter(Boolean)
    .join(' ');

  const matched = matchOperator(haystack);
  const presence = await readPresence();

  // If the matched person is off but the other is on, offer the one who is
  // on, with their own tag. The card never shows someone who will not answer.
  let id = matched.id;
  let tag = matched.tag;
  if (!presence[id]) {
    const other = MATCH_ORDER.find((o) => o !== id && presence[o]);
    if (other) {
      id = other;
      tag = tagFor(other, haystack);
    }
  }

  const op = OPERATORS[id];
  return NextResponse.json({
    online: presence[id],
    card: {
      id: op.id,
      name: op.name,
      role: op.role,
      photo: op.photo,
      location: op.location,
      linkedin: op.linkedin,
      companies: op.companies,
      rating: op.rating,
      fixes: op.fixes,
      tag,
    },
  });
}

export const POST = withMetrics('presence', handlePresence);
