import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildSummary } from '@/lib/callSummary';
import { answerCall, createCall, endCall, readCall } from '@/lib/callStore';
import { createAudioRoom } from '@/lib/daily';
import { withMetrics } from '@/lib/metrics';
import { OPERATORS, type OperatorId } from '@/lib/operators';
import { readPresence } from '@/lib/presence';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { editRing, sendRing } from '@/lib/telegram';
import { coerceBrief, parseSessionId } from '@/lib/validate';

export const RING_SECONDS = 60;

const RING_WINDOW_MS = 5 * 60_000;
const MAX_MESSAGE_CHARS = 600;
const MAX_TRACKED_SESSIONS = 5_000;

// One ring per session every five minutes. Presence already gates who can
// be reached at all; this stops a single visitor from ringing on a loop.
const lastRing = new Map<string, number>();

function isOperatorId(v: unknown): v is OperatorId {
  return v === 'pulkit' || v === 'rohit';
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) return forbidden();
  if (!rateLimit(clientId(req), 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action === 'answer') {
    const id = typeof body.callId === 'string' ? body.callId : '';
    if (!id) return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    // answerCall is a compare and set, so the loser of a race between the
    // Telegram tap and the operator page tap learns it lost right here.
    const won = await answerCall(id);
    return NextResponse.json({ ok: true, alreadyAnswered: !won });
  }

  if (body.action === 'end') {
    const id = typeof body.callId === 'string' ? body.callId : '';
    if (!id) return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    const missed = body.missed === true;
    await endCall(id, missed ? 'missed' : 'ended');
    // A missed call leaves a Telegram message inviting you into a room
    // nobody is in. Edit it so a late tap does not land in an empty call.
    if (missed) {
      const messageId = typeof body.messageId === 'number' ? body.messageId : null;
      if (messageId !== null && isOperatorId(body.operatorId)) {
        await editRing(
          body.operatorId,
          messageId,
          'They gave up waiting and booked a time instead.',
        );
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action !== 'ring') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const operatorId = body.operatorId;
  if (!isOperatorId(operatorId)) {
    return NextResponse.json({ error: 'Unknown operator' }, { status: 400 });
  }

  const sessionId = parseSessionId(body.sessionId);
  const ringKey = sessionId ?? clientId(req);
  const previous = lastRing.get(ringKey) ?? 0;
  if (Date.now() - previous < RING_WINDOW_MS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Presence is rechecked here rather than trusted from the client. The tap
  // and the ring are seconds apart, and a switch can flip in between.
  const presence = await readPresence();
  if (!presence[operatorId]) {
    return NextResponse.json({ error: 'Nobody is available' }, { status: 503 });
  }

  const callId = randomUUID();
  const roomUrl = await createAudioRoom(callId);
  if (!roomUrl) {
    return NextResponse.json({ error: 'Could not start the call' }, { status: 503 });
  }

  lastRing.set(ringKey, Date.now());
  if (lastRing.size > MAX_TRACKED_SESSIONS) lastRing.clear();

  const lastMessage =
    typeof body.lastMessage === 'string' ? body.lastMessage.slice(0, MAX_MESSAGE_CHARS) : '';
  const summary = buildSummary(coerceBrief(body.brief), lastMessage);

  await createCall({ id: callId, sessionId, operatorId, roomUrl, summary });
  const messageId = await sendRing(operatorId, summary, roomUrl);

  return NextResponse.json({
    callId,
    roomUrl,
    messageId,
    operator: OPERATORS[operatorId].name,
  });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) return forbidden();
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const row = await readCall(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ status: row.status, roomUrl: row.room_url });
}

export const POST = withMetrics('call', handlePost);
export const GET = withMetrics('call', handleGet);
