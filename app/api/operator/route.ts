import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import type { OperatorId } from '@/lib/operators';
import { isAuthorised } from '@/lib/operatorAuth';
import { readPresence, setPresence } from '@/lib/presence';

// One shared secret for one shared device. An unset secret denies
// everyone: an unguarded switch is worse than an unreachable one.

function isOperatorId(v: unknown): v is OperatorId {
  return v === 'pulkit' || v === 'rohit';
}



async function handlePost(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isOperatorId(body.operatorId)) {
    return NextResponse.json({ error: 'Unknown operator' }, { status: 400 });
  }
  const moved = await setPresence(body.operatorId, body.online === true);
  if (!moved) {
    // Saying ok while the switch did not move is how someone ends up
    // tapping a dead control and blaming their phone.
    return NextResponse.json(
      {
        error: 'That switch did not move. The operator row is missing or Supabase is unreachable.',
        presence: await readPresence(),
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, presence: await readPresence() });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ presence: await readPresence() });
}

export const POST = withMetrics('operator', handlePost);
export const GET = withMetrics('operator', handleGet);
