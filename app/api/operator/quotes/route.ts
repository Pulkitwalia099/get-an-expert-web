import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { moveQuote, quoteQueue } from '@/lib/operatorQuotes';

// Reading the requests, and moving one along by hand, behind the same shared
// secret as the presence switches.
//
// The outbound agents own this in the normal case: they claim an open request,
// work it, and set the status themselves. This route exists because "the
// automation is wrong and a customer is waiting" is a situation that turns up
// on a phone, and the alternative is editing rows in the Supabase console.
//
// The reads and the checks both live in lib/operatorQuotes now. This file used
// to hold them inline, and one of them was wrong in a way nothing would ever
// report: a failed select came back as an empty list, so a Supabase blip drew
// a page saying there was nothing to work.

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await quoteQueue();
  if (requests === null) {
    return NextResponse.json({ error: 'Cannot reach the requests right now' }, { status: 502 });
  }
  return NextResponse.json({ requests });
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

  const moved = await moveQuote(body.id, body.status);
  // A refused move is something to put on screen, not a stack trace. Which
  // code it carries is the difference between "you sent nonsense" and "try
  // again in a minute", and only the second is worth retrying.
  if (!moved.ok) {
    return NextResponse.json(
      { error: moved.error },
      { status: moved.reason === 'storage' ? 503 : 400 },
    );
  }
  return NextResponse.json({ ok: true, status: body.status });
}

export const GET = withMetrics('operator-quotes', handleGet);
export const POST = withMetrics('operator-quotes', handlePost);
