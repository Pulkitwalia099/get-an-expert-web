import { NextRequest, NextResponse } from 'next/server';
import { patchRows } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { selectRows } from '@/lib/supabase';
import { STATUS_LABELS, type QuoteStatus } from '@/lib/quotes';

// Moving a request along by hand, behind the same shared secret as the
// presence switches.
//
// The outbound agents own this in the normal case: they claim an open request,
// work it, and set the status themselves. This route exists because "the
// automation is wrong and a customer is waiting" is a situation that turns up
// on a phone, and the alternative is editing rows in the Supabase console.

function isStatus(v: unknown): v is QuoteStatus {
  return typeof v === 'string' && v in STATUS_LABELS;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Row {
  id: string;
  set_id: string;
  email: string;
  slots: number[];
  status: QuoteStatus;
  created_at: string;
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Everything still to be worked, oldest first, which is the order somebody
  // should actually work them in.
  const rows = await selectRows<Row>(
    'quote_requests',
    'status=in.(open,contacting)&select=id,set_id,email,slots,status,created_at&order=created_at.asc&limit=50',
  );
  return NextResponse.json({ requests: rows ?? [] });
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

  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: 'Unknown request' }, { status: 400 });
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
  }

  const moved = await patchRows('quote_requests', `id=eq.${encodeURIComponent(id)}`, {
    status: body.status,
    updated_at: new Date().toISOString(),
  });
  if (!moved) {
    return NextResponse.json({ error: 'That did not save.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, status: body.status });
}

export const GET = withMetrics('operator-quotes', handleGet);
export const POST = withMetrics('operator-quotes', handlePost);
