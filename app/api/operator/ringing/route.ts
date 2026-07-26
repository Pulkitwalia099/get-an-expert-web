import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { selectRows } from '@/lib/supabase';

// The newest ringing call, if any. Only reachable with the operator
// secret, because it exposes a join url. The guard is repeated here rather
// than imported from the sibling route: a route file may only export the
// HTTP methods Next knows about, so there is nowhere shared to put it
// without a new lib file.

interface Row {
  id: string;
  room_url: string | null;
  created_at: string;
}

// Older rings are stale. A call gives up after 60 seconds, so 90 leaves
// room for a slow poll without ever offering a room nobody is waiting in.
const WINDOW_MS = 90_000;

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.OPERATOR_SECRET;
  // Header, never the query string: this response carries a Daily join url.
  const given = req.headers.get('x-operator-secret');
  if (!expected || given !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const rows = await selectRows<Row>(
    'calls',
    `status=eq.ringing&created_at=gte.${since}&select=id,room_url,created_at&order=created_at.desc&limit=1`,
  );
  const row = rows?.[0];
  return NextResponse.json({
    call: row?.room_url ? { callId: row.id, roomUrl: row.room_url } : null,
  });
}

export const GET = withMetrics('operator-ringing', handleGet);
