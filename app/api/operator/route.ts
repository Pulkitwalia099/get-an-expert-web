import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import type { OperatorId } from '@/lib/operators';
import { readPresence, setPresence } from '@/lib/presence';

// One shared secret for one shared device. An unset secret denies
// everyone: an unguarded switch is worse than an unreachable one.

function isOperatorId(v: unknown): v is OperatorId {
  return v === 'pulkit' || v === 'rohit';
}

const SECRET_HEADER = 'x-operator-secret';

function authorised(secret: unknown): boolean {
  const expected = process.env.OPERATOR_SECRET;
  // Boolean(expected) first, so an empty or missing env var can never be
  // matched by an empty supplied secret.
  return Boolean(expected) && typeof secret === 'string' && secret === expected;
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!authorised(req.headers.get(SECRET_HEADER))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isOperatorId(body.operatorId)) {
    return NextResponse.json({ error: 'Unknown operator' }, { status: 400 });
  }
  await setPresence(body.operatorId, body.online === true);
  return NextResponse.json({ ok: true, presence: await readPresence() });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!authorised(req.headers.get(SECRET_HEADER))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ presence: await readPresence() });
}

export const POST = withMetrics('operator', handlePost);
export const GET = withMetrics('operator', handleGet);
