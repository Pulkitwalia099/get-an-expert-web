import { NextRequest, NextResponse } from 'next/server';
import { clientId } from '@/lib/ratelimit';
import { processSetupRequest } from '@/lib/requests';

export const runtime = 'nodejs';

// Setup-page forms: free consultation bookings and "seen a setup we're
// missing" reel submissions. All behavior lives in lib/requests.ts, which the
// acceptance tests exercise directly.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const result = await processSetupRequest(body, clientId(req));
  return NextResponse.json(result.body, { status: result.status });
}
