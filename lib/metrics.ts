import { NextRequest, NextResponse } from 'next/server';
import { recordEvent } from '@/lib/supabase';

type Handler = (req: NextRequest) => Promise<NextResponse>;

// Wraps a route handler so every request lands in api_events with its
// status and latency, and an uncaught error becomes a clean 500 instead of
// anything resembling a stack trace.
export function withMetrics(route: string, handler: Handler): Handler {
  return async (req) => {
    const started = Date.now();
    try {
      const res = await handler(req);
      await recordEvent(route, res.status, Date.now() - started);
      return res;
    } catch (err) {
      console.error(`[midsesh:${route}] unhandled`, err);
      await recordEvent(route, 500, Date.now() - started, err instanceof Error ? err.message : 'unknown');
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}
